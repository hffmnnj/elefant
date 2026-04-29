# ADR-0003: Parent → child cancellation propagation

**Status:** Accepted
**Date:** 2026-04-28
**Workflow:** agent-harness-research
**Recommendation:** [R2](../../markdown-db/07-research/HARNESS-RECOMMENDATIONS.md)
**MH:** MH9

## Context

Elefant's `task` tool created a child `AbortController` and registered the child run, but it did not explicitly wire the parent run's abort signal to the child controller. This meant that when a parent run was aborted, the child run would not automatically cancel unless an external caller explicitly invoked `runRegistry.abortRun(parent)` for propagation (`src/tools/task/index.ts:137-148`; `src/runs/registry.ts:40-63`). Reference implementations (OpenCode, Claude Code) treat parent→child cancellation as a hard guarantee: when the parent is aborted, the child is cancelled automatically via signal listener attachment.

The gap lived in the absence of an abort signal listener on the parent's AbortSignal. Without it, child runs could continue executing even after the parent was cancelled, leading to wasted work and potential resource leaks.

## Decision

Added a `wireParentAbortToChild()` helper function in `src/tools/task/index.ts` that attaches a one-shot listener to the parent run's abort signal. The function:

1. Registers a listener on `parentSignal` that calls `childController.abort()` when the parent is aborted
2. Uses `{ once: true }` to ensure the listener fires only once
3. Returns a cleanup function that removes the listener to prevent leaks
4. Is called immediately after creating the child controller (line 153)
5. The cleanup function is invoked in a `finally` block to guarantee listener removal

Additionally, the task tool now checks if the parent signal is already aborted before starting the child, and short-circuits with a deterministic error if so (lines 145-151).

### Files modified
- `src/tools/task/index.ts` — Added `wireParentAbortToChild()` helper (lines 47-51); integrated parent abort listener attachment (line 153) and cleanup in finally block (line 154)
- `src/tools/task/task.test.ts` — Added 3 new tests covering parent abort propagation, listener cleanup, and pre-aborted parent detection

### Commit(s)
No dedicated commit; landed inside Wave 5 (task 5.1)

## Consequences

### Positive
- Aborting a parent run's AbortSignal reliably aborts the child run without requiring external registry calls
- Listener cleanup is guaranteed via finally block, preventing handler leaks
- Parent cancellation semantics are now deterministic and testable
- Child runs cannot outlive their parent

### Negative / accepted trade-offs
- Adds a small listener registration overhead per task tool invocation (negligible)
- Listener cleanup relies on finally block execution; if finally is skipped, listeners could leak (mitigated by test coverage)

### Backward compatibility
Existing code that calls the task tool continues to work unchanged. Code that previously relied on external `runRegistry.abortRun()` calls for parent→child propagation will now see automatic propagation, which is strictly safer and more correct.

## Evidence

- [Mechanism: opencode-dev](../../markdown-db/06-mechanisms/opencode-dev.md) — OpenCode task tool attaches parent AbortSignal listener to cancel child (opencode-dev.md:254-287)
- [Mechanism: claude-code](../../markdown-db/06-mechanisms/claude-code.md) — Claude Code models explicit abort-controller passing and distinguishes detached async modes (claude-code.md:428-444)
- [Research: sub-agent-architectures](../../markdown-db/07-research/sub-agent-architectures.md) — flags Elefant's current gap ("task tool does not attach parent signal to child controller") and marks this P0 (sub-agent-architectures.md:45-52, :178-182)

## Follow-ups

This refinement completes the sub-agent dispatch layer (R2 cancellation propagation). Future work (P1) includes tightening `context_mode` semantics (R6) to ensure deterministic child context isolation.

---

*Captured during Wave 8 of the agent-harness-research workflow.*
