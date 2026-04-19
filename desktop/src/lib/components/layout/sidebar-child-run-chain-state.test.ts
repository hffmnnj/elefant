// Tests for the pure sidebar child-run-chain state helper.
//
// The project has no component renderer, so these tests exercise the
// pure logic that drives whether the chain renders and what rows are
// produced — the same pattern used by AgentTaskCard/ChildRunView tests.

import { describe, expect, it } from 'bun:test';
import type { AgentRun } from '$lib/types/agent-run.js';
import {
	buildChildRunRowIndent,
	computeRollupVariant,
	computeSidebarChildRunChain,
	computeStatusVariant,
	type SidebarChildRunRow,
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

describe('computeStatusVariant — per-row indicator logic', () => {
	it('returns "running" when the run is live', () => {
		const run = makeRun({ status: 'running' });
		expect(computeStatusVariant(run, false, false)).toBe('running');
	});

	it('returns "blocked" when awaiting a question answer', () => {
		const run = makeRun({ status: 'done' });
		expect(computeStatusVariant(run, false, true)).toBe('blocked');
	});

	it('returns "error" on a terminated-with-error run', () => {
		const run = makeRun({ status: 'error' });
		expect(computeStatusVariant(run, false, false)).toBe('error');
	});

	it('returns "unseen" when the run has unseen output and no higher signal', () => {
		const run = makeRun({ status: 'done' });
		expect(computeStatusVariant(run, true, false)).toBe('unseen');
	});

	it('returns "none" for a quiet done run', () => {
		const run = makeRun({ status: 'done' });
		expect(computeStatusVariant(run, false, false)).toBe('none');
	});

	it('returns "none" for a cancelled run with no other signal', () => {
		const run = makeRun({ status: 'cancelled' });
		expect(computeStatusVariant(run, false, false)).toBe('none');
	});
});

describe('computeStatusVariant — priority order', () => {
	it('running outranks blocked, error, and unseen', () => {
		const run = makeRun({ status: 'running' });
		// Even with blocked + unseen both set, running dominates.
		expect(computeStatusVariant(run, true, true)).toBe('running');
	});

	it('blocked outranks error and unseen (non-running run)', () => {
		const run = makeRun({ status: 'error' });
		// Error on status + awaiting question + unseen → blocked wins.
		expect(computeStatusVariant(run, true, true)).toBe('blocked');
	});

	it('error outranks unseen when not running and not blocked', () => {
		const run = makeRun({ status: 'error' });
		expect(computeStatusVariant(run, true, false)).toBe('error');
	});

	it('unseen beats none when the run is otherwise quiet', () => {
		const run = makeRun({ status: 'done' });
		expect(computeStatusVariant(run, true, false)).toBe('unseen');
	});
});

describe('computeRollupVariant — session-row aggregate', () => {
	const rowFor = (run: AgentRun, depth = 1): SidebarChildRunRow => ({
		run,
		depth,
	});

	it('returns "none" for an empty chain', () => {
		const variant = computeRollupVariant(
			[],
			() => false,
			() => false,
		);
		expect(variant).toBe('none');
	});

	it('returns "none" when every row is quiet', () => {
		const rows = [
			rowFor(makeRun({ runId: 'a', status: 'done' })),
			rowFor(makeRun({ runId: 'b', status: 'cancelled' })),
		];
		const variant = computeRollupVariant(
			rows,
			() => false,
			() => false,
		);
		expect(variant).toBe('none');
	});

	it('picks "running" when any row is running (highest priority)', () => {
		const rows = [
			rowFor(makeRun({ runId: 'a', status: 'done' })),
			rowFor(makeRun({ runId: 'b', status: 'running' })),
			rowFor(makeRun({ runId: 'c', status: 'error' })),
		];
		const variant = computeRollupVariant(
			rows,
			() => false,
			() => false,
		);
		expect(variant).toBe('running');
	});

	it('picks "blocked" when no row is running but one is awaiting a question', () => {
		const rows = [
			rowFor(makeRun({ runId: 'a', status: 'done' })),
			rowFor(makeRun({ runId: 'b', status: 'error' })),
		];
		const awaiting = new Set(['a']);
		const variant = computeRollupVariant(
			rows,
			() => false,
			(id) => awaiting.has(id),
		);
		expect(variant).toBe('blocked');
	});

	it('picks "error" over "unseen" when both are present and no higher signal', () => {
		const rows = [
			rowFor(makeRun({ runId: 'a', status: 'error' })),
			rowFor(makeRun({ runId: 'b', status: 'done' })),
		];
		const unseen = new Set(['b']);
		const variant = computeRollupVariant(
			rows,
			(id) => unseen.has(id),
			() => false,
		);
		expect(variant).toBe('error');
	});

	it('picks "unseen" as the softest non-none rollup signal', () => {
		const rows = [
			rowFor(makeRun({ runId: 'a', status: 'done' })),
			rowFor(makeRun({ runId: 'b', status: 'done' })),
		];
		const unseen = new Set(['b']);
		const variant = computeRollupVariant(
			rows,
			(id) => unseen.has(id),
			() => false,
		);
		expect(variant).toBe('unseen');
	});
});
