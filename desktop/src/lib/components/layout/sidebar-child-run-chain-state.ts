// Pure helpers for the Sidebar active-child-run chain (MH3).
//
// When a child run is the active view in the main pane, the sidebar
// surfaces the ancestor chain — from the session's root run down to the
// active child — as indented rows directly underneath the active
// session's row. Only the active path is rendered (not the full
// forest), matching the OpenCode sidebar pattern.
//
// This module is intentionally pure so every visual branch can be
// unit-tested without a component renderer (same pattern established by
// agent-task-card-state.ts and child-run-view-state.ts).

import type { AgentRun } from '$lib/types/agent-run.js';

/** A row to render under the session, with its indent depth. */
export interface SidebarChildRunRow {
	run: AgentRun;
	/** 1 for direct children of the session root, 2 for grandchildren, etc. */
	depth: number;
}

/**
 * Inputs needed to decide whether the chain should render and what
 * rows it should contain. The helper never reaches into any store so
 * it stays trivially testable.
 */
export interface SidebarChildRunChainInputs {
	/** Whether the row being drawn belongs to the active session. */
	isActiveSession: boolean;
	/** The current view in the navigation store. */
	currentView: string;
	/** The currently-active child run id (from navigation store). */
	currentChildRunId: string | null;
	/**
	 * All runs in this session (unsorted is fine — we walk by runId).
	 * This is `agentRunsStore.runsForSession(sessionId)` in the caller.
	 */
	sessionRuns: AgentRun[];
	/**
	 * The full active child path including the root run at index 0
	 * and the currently-active child run at the end. This is
	 * `agentRunsStore.activeChildPath(rootRunId, currentChildRunId)` —
	 * but since the caller does not know `rootRunId` yet, this helper
	 * accepts it as an opaque list (empty when no active path).
	 */
	activeChildPath: AgentRun[];
}

/**
 * Decide whether the child-run chain should render under this session
 * row, and return the rows (root-excluded, with indent depth) to draw.
 *
 * Rules (from SPEC MH3):
 *   1. Only the ACTIVE session surfaces a chain.
 *   2. The main pane must be in "chat" or "child-run" view.
 *   3. There must be a current child run id.
 *   4. The active child path must contain at least two entries
 *      (root + one child) — a chain of one is just the root session
 *      itself and adds nothing.
 *   5. The root run (activeChildPath[0]) must belong to this session
 *      (i.e., be present in sessionRuns). This guards against a stale
 *      childRunId that points into another session — we must not leak
 *      a chain from session A into session B's row.
 *   6. Returns the path WITHOUT the root (since the session row
 *      already represents the root). Each returned row carries a
 *      depth starting at 1.
 */
export function computeSidebarChildRunChain(
	inputs: SidebarChildRunChainInputs,
): SidebarChildRunRow[] {
	const {
		isActiveSession,
		currentView,
		currentChildRunId,
		sessionRuns,
		activeChildPath,
	} = inputs;

	// Rule 1: only the active session renders a chain.
	if (!isActiveSession) return [];

	// Rule 2: chain is only relevant inside the chat/child-run flow.
	if (currentView !== 'chat' && currentView !== 'child-run') return [];

	// Rule 3: no active child run → nothing to surface.
	if (!currentChildRunId) return [];

	// Rule 4: need a real chain (root + at least one descendant).
	if (activeChildPath.length < 2) return [];

	// Rule 5: the root must belong to this session. We check against
	// the session's run list to be defensive — a child-run id from a
	// different session must never render under this row.
	const rootRun = activeChildPath[0];
	const rootBelongsToSession = sessionRuns.some(
		(run) => run.runId === rootRun.runId,
	);
	if (!rootBelongsToSession) return [];

	// Skip the root (the session row already represents it) and
	// assign a 1-based depth so the first descendant sits one level
	// deeper than the session.
	return activeChildPath.slice(1).map((run, idx) => ({
		run,
		depth: idx + 1,
	}));
}

/**
 * Compute the inline style used to indent a child-run row by depth.
 * Exposed as a helper so the component template stays declarative and
 * tests can assert the indentation math without reading CSS.
 *
 * Uses the design-system `--space-4` token as the per-level step so
 * the indent scales with the rest of the sidebar spacing rhythm.
 */
export function buildChildRunRowIndent(depth: number): string {
	const safeDepth = Math.max(0, Math.trunc(depth));
	return `calc(var(--space-4) * ${safeDepth})`;
}
