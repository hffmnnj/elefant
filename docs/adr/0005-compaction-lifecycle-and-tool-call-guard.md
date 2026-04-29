# ADR-0005: Compaction lifecycle hooks + tool-call guard

**Status:** Accepted
**Date:** 2026-04-28
**Workflow:** agent-harness-research
**Recommendation:** [R4](../../markdown-db/07-research/HARNESS-RECOMMENDATIONS.md)
**MH:** MH11

## Context

Elefant compaction was threshold-based and hook-extensible, but it lacked a hard safety guard to prevent compacting at an invalid transcript boundary (e.g., after a `tool_call` message without its paired `tool_result`). Additionally, compaction was modeled as a single hook (`session:compact`) rather than a lifecycle that could be safely instrumented (`src/compaction/manager.ts:36-115`, `src/hooks/types.ts:84-89`). Reference systems (Claude Code, Pi) treat compaction as a lifecycle (PreCompact/PostCompact) and explicitly deny tool use during summarization to preserve tool-call pairing and replayability.

The gap lived in two places: (1) no guard to detect pending tool calls, and (2) no pre/post lifecycle hooks to instrument compaction safely. Without them, compaction could occur mid-tool-call, corrupting the transcript, and integrations had no deterministic instrumentation points.

## Decision

Added two complementary safeguards:

1. **Pending tool-call detection** (`src/runs/messages.ts:24-50`):
   - Introduced `hasUnpairedToolCall(messages)` helper that returns true if the last message role is `tool_call` (or if a stricter heuristic detects an unpaired tool call)
   - Handles both runtime `Message[]` shape (with `toolCalls` array) and persisted-role shape (with `role: 'tool_call'`)

2. **Compaction lifecycle hooks** (`src/hooks/types.ts:20-40`):
   - Added `session:pre_compact` hook (emitted before compaction, can be used to cancel or add instructions)
   - Added `session:post_compact` hook (emitted after compaction, for telemetry/UI messaging)
   - Both hooks receive context with `messagesBefore`, `messagesAfter`, `didCompact`, and optional `skipReason`
   - Kept existing `session:compact` hook as the summary provider to avoid breaking changes

3. **Guard integration** (`src/compaction/manager.ts:36-115`):
   - In `CompactionManager.compact()`, check `hasUnpairedToolCall(messages)` before summarization
   - If guard is true, skip compaction and return `{ messages, summary: "[Compaction skipped: pending tool call]", didCompact: false, skipReason: 'pending_tool_call' }`
   - Emit `session:pre_compact` first (cancellable)
   - Emit `session:post_compact` after with `didCompact` and optional `skipReason`

### Files modified
- `src/compaction/manager.ts` — Added guard check (lines 45-52); integrated pre/post lifecycle hooks (lines 60-75, :95-105); extended return type with `didCompact` and `skipReason` fields
- `src/compaction/manager.test.ts` — Added 6 new tests covering guard behavior, lifecycle ordering, and skip metadata
- `src/compaction/types.ts` — Extended `CompactionResult` type with `didCompact: boolean` and `skipReason?: string`
- `src/hooks/registry.ts` — Registered `session:pre_compact` and `session:post_compact` event names
- `src/hooks/types.ts` — Added `HookContextMap['session:pre_compact']` and `HookContextMap['session:post_compact']` types (lines 20-40)
- `src/runs/messages.ts` — Added `hasUnpairedToolCall()` helper (lines 24-50)

### Commit(s)
1a1c96d: feat(compaction): Add lifecycle hooks and tool-call guard

## Consequences

### Positive
- Compaction never runs when the current transcript ends with an unmatched `tool_call`, preserving transcript integrity
- Lifecycle hooks give integrations deterministic pre/post instrumentation without changing the existing `session:compact` contract
- Skip metadata (`didCompact`, `skipReason`) enables UI/logging to distinguish between successful compaction and skipped compaction
- Tool-call pairing is guaranteed, enabling safe transcript replay and replayability

### Negative / accepted trade-offs
- Adds a small guard check overhead to every compaction call (negligible)
- Lifecycle hooks are new; existing code that doesn't register them sees no change, but new integrations must be aware of them
- Compaction can be skipped if a tool call is pending, which could delay context cleanup (this is intentional and safe)

### Backward compatibility
Existing code that calls `CompactionManager.compact()` continues to work unchanged. The return type is extended with `didCompact` and `skipReason`, which are optional and default to `true` and `undefined` for backward compatibility. Existing `session:compact` hook behavior is unchanged; new `session:pre_compact` and `session:post_compact` hooks are optional.

## Evidence

- [Mechanism: claude-code](../../markdown-db/06-mechanisms/claude-code.md) — compaction has explicit PreCompact/PostCompact hooks and the summarizer is denied all tool use (claude-code.md:702-731, :1026-1058)
- [Mechanism: pi-mono](../../markdown-db/06-mechanisms/pi-mono.md) — compaction is an explicit entry type and session context is rebuilt along a tree path, reinforcing the value of consistent boundaries (pi-mono.md:522-538, :487-520)
- [Research: context-management](../../markdown-db/07-research/context-management.md) — explicitly calls out "don't compact mid-tool-call" as a P0 guard and maps to `src/runs/messages.ts` + `src/compaction/manager.ts` (context-management.md:38-45, :298-302, :271-281)

## Follow-ups

This refinement completes the context management layer (R4 compaction lifecycle + guard). Future work (P2) includes replacing fixed retained ratio with target post-compact utilization (R8) to improve compaction quality.

---

*Captured during Wave 8 of the agent-harness-research workflow.*
