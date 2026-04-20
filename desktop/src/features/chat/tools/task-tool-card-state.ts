// Pure helpers for TaskToolCard display state.
//
// TaskToolCard.svelte is the chat-surface adapter that translates a
// `task` ToolCallDisplay into props for AgentTaskCard. The chat surface
// only sees `(id, name, arguments, result)` — no parent runId, no
// tool_call_metadata — so the adapter must:
//
//   1. Defensively pull `description` and `agent_type` out of the
//      tool-call arguments (which may be empty mid-stream while the
//      model is still emitting JSON).
//   2. Resolve the child runId by scanning the agent-runs store for a
//      spawned run whose `title` matches `description`. The daemon's
//      `task` tool sets `childCtx.title = params.description` before
//      spawning, so this title-match is deterministic — same fallback
//      pattern used by `agent-run-transcript-blocks.ts` for `task`
//      blocks in AgentRunTranscript.
//
// Extracting these into a pure module keeps the Svelte component thin
// and lets us unit test every branch without a component renderer (the
// project has no @testing-library/svelte — see AgentTaskCard.test.ts
// and agent-task-card-state.ts for the same pattern).

import type { AgentRun } from '$lib/types/agent-run.js';
import type { ToolCallDisplay } from '../types.js';

/** Fallback used when the model has not yet emitted an `agent_type`. */
export const DEFAULT_AGENT_TYPE = 'agent';

/**
 * Pull `description` out of the tool-call arguments. Returns an empty
 * string when the field is missing or not a string — the adapter's
 * placeholder branch handles the empty case.
 */
export function extractTaskDescription(toolCall: ToolCallDisplay): string {
	const value = toolCall.arguments?.description;
	return typeof value === 'string' ? value : '';
}

/**
 * Pull `agent_type` out of the tool-call arguments, falling back to a
 * generic `'agent'` when the field is missing or not a string. The
 * fallback keeps AgentTaskCard's icon/aria-label sensible while the
 * model is still mid-stream.
 */
export function extractTaskAgentType(toolCall: ToolCallDisplay): string {
	const value = toolCall.arguments?.agent_type;
	return typeof value === 'string' ? value : DEFAULT_AGENT_TYPE;
}

/**
 * Resolve the spawned child runId for a `task` tool call by scanning
 * the agent-runs store's `runs` map for a row whose title matches the
 * tool call's `description`.
 *
 * Resolution rules:
 *   - Empty/whitespace `description` never resolves (avoids matching
 *     the first titleless run by accident).
 *   - First match wins. Two `task` calls with identical descriptions
 *     within the same project will collide on the older spawned run —
 *     this is the same trade-off the transcript-blocks tier-2
 *     fallback accepts and is rare in practice (descriptions are
 *     prompt-derived and effectively unique per call).
 *   - Returns `null` until the matching `agent_run.spawned` SSE event
 *     hydrates the store.
 */
export function resolveTaskToolCardChildRunId(
	description: string,
	runsById: Record<string, AgentRun>,
): string | null {
	if (!description) return null;
	for (const run of Object.values(runsById)) {
		if (run.title === description) return run.runId;
	}
	return null;
}
