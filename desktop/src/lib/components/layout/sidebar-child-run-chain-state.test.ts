// Tests for the pure sidebar child-run-chain state helper.
//
// The project has no component renderer, so these tests exercise the
// pure logic that drives whether the chain renders and what rows are
// produced — the same pattern used by AgentTaskCard/ChildRunView tests.

import { describe, expect, it } from 'bun:test';
import type { AgentRun } from '$lib/types/agent-run.js';
import {
	buildChildRunRowIndent,
	computeSidebarChildRunChain,
} from './sidebar-child-run-chain-state.js';

const makeRun = (overrides: Partial<AgentRun> = {}): AgentRun => ({
	runId: 'run-root',
	sessionId: 'sess-1',
	projectId: 'proj-1',
	parentRunId: null,
	agentType: 'primary',
	title: 'Root run',
	status: 'running',
	contextMode: 'inherit_session',
	createdAt: '2026-04-19T00:00:00.000Z',
	startedAt: '2026-04-19T00:00:00.000Z',
	endedAt: null,
	errorMessage: null,
	...overrides,
});

const rootRun = makeRun({ runId: 'root', parentRunId: null, title: 'Root' });
const childRun = makeRun({
	runId: 'child',
	parentRunId: 'root',
	title: 'Child',
});
const grandchildRun = makeRun({
	runId: 'grandchild',
	parentRunId: 'child',
	title: 'Grandchild',
});

describe('computeSidebarChildRunChain — visibility rules', () => {
	it('renders nothing when the session is not the active one', () => {
		const rows = computeSidebarChildRunChain({
			isActiveSession: false,
			currentView: 'chat',
			currentChildRunId: 'child',
			sessionRuns: [rootRun, childRun],
			activeChildPath: [rootRun, childRun],
		});
		expect(rows).toEqual([]);
	});

	it('renders nothing when the current view is not chat or child-run', () => {
		const rows = computeSidebarChildRunChain({
			isActiveSession: true,
			currentView: 'settings',
			currentChildRunId: 'child',
			sessionRuns: [rootRun, childRun],
			activeChildPath: [rootRun, childRun],
		});
		expect(rows).toEqual([]);
	});

	it('renders nothing when there is no active child run id', () => {
		const rows = computeSidebarChildRunChain({
			isActiveSession: true,
			currentView: 'chat',
			currentChildRunId: null,
			sessionRuns: [rootRun],
			activeChildPath: [],
		});
		expect(rows).toEqual([]);
	});

	it('renders nothing when the active child path has only the root', () => {
		const rows = computeSidebarChildRunChain({
			isActiveSession: true,
			currentView: 'chat',
			currentChildRunId: 'root',
			sessionRuns: [rootRun],
			activeChildPath: [rootRun],
		});
		expect(rows).toEqual([]);
	});

	it('renders nothing when the active path belongs to another session', () => {
		const rows = computeSidebarChildRunChain({
			isActiveSession: true,
			currentView: 'chat',
			currentChildRunId: 'child',
			// sessionRuns does not contain the root of the active path —
			// a stale active child id must not leak into this session row.
			sessionRuns: [makeRun({ runId: 'different-root' })],
			activeChildPath: [rootRun, childRun],
		});
		expect(rows).toEqual([]);
	});
});

describe('computeSidebarChildRunChain — happy path', () => {
	it('returns a single indented row for a one-level child chain', () => {
		const rows = computeSidebarChildRunChain({
			isActiveSession: true,
			currentView: 'chat',
			currentChildRunId: 'child',
			sessionRuns: [rootRun, childRun],
			activeChildPath: [rootRun, childRun],
		});
		expect(rows).toHaveLength(1);
		expect(rows[0].run.runId).toBe('child');
		expect(rows[0].depth).toBe(1);
	});

	it('returns two indented rows for a two-level chain in child-run view', () => {
		const rows = computeSidebarChildRunChain({
			isActiveSession: true,
			currentView: 'child-run',
			currentChildRunId: 'grandchild',
			sessionRuns: [rootRun, childRun, grandchildRun],
			activeChildPath: [rootRun, childRun, grandchildRun],
		});
		expect(rows).toHaveLength(2);
		expect(rows[0].run.runId).toBe('child');
		expect(rows[0].depth).toBe(1);
		expect(rows[1].run.runId).toBe('grandchild');
		expect(rows[1].depth).toBe(2);
	});

	it('preserves the order from the active child path', () => {
		const rows = computeSidebarChildRunChain({
			isActiveSession: true,
			currentView: 'chat',
			currentChildRunId: 'grandchild',
			sessionRuns: [rootRun, childRun, grandchildRun],
			activeChildPath: [rootRun, childRun, grandchildRun],
		});
		const runIds = rows.map((r) => r.run.runId);
		expect(runIds).toEqual(['child', 'grandchild']);
	});

	it('excludes the root run from the rendered rows', () => {
		const rows = computeSidebarChildRunChain({
			isActiveSession: true,
			currentView: 'chat',
			currentChildRunId: 'child',
			sessionRuns: [rootRun, childRun],
			activeChildPath: [rootRun, childRun],
		});
		const runIds = rows.map((r) => r.run.runId);
		expect(runIds).not.toContain('root');
	});
});

describe('buildChildRunRowIndent', () => {
	it('scales the indent by depth using the design-system space token', () => {
		expect(buildChildRunRowIndent(1)).toBe('calc(var(--space-4) * 1)');
		expect(buildChildRunRowIndent(2)).toBe('calc(var(--space-4) * 2)');
		expect(buildChildRunRowIndent(3)).toBe('calc(var(--space-4) * 3)');
	});

	it('clamps non-finite or negative depths to zero', () => {
		expect(buildChildRunRowIndent(-1)).toBe('calc(var(--space-4) * 0)');
		expect(buildChildRunRowIndent(0)).toBe('calc(var(--space-4) * 0)');
	});

	it('truncates fractional depths to an integer', () => {
		expect(buildChildRunRowIndent(1.7)).toBe('calc(var(--space-4) * 1)');
	});
});
