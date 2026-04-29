# ADR-0004: Explicit allow / ask / deny permission decisions

**Status:** Accepted
**Date:** 2026-04-28
**Workflow:** agent-harness-research
**Recommendation:** [R3](../../markdown-db/07-research/HARNESS-RECOMMENDATIONS.md)
**MH:** MH10

## Context

Elefant's permission decision shape was primarily boolean (`Decision.approved`) and the gate auto-approved all `medium` risk calls by default (`src/permissions/types.ts:7-12`, `src/permissions/gate.ts:123-147`). Although Elefant already defined `PermissionDecisionStatus = 'allow'|'ask'|'deny'` and permitted hooks to set `status` (`src/permissions/types.ts:3-5`, `src/hooks/types.ts:106-117`), the gate never implemented an `ask` branch: only `high` risk triggered a user approval request over WebSocket (`src/permissions/gate.ts:182-218`). This collapsed an important control surface (ask vs allow) and prevented durable "approved ruleset" patterns where plugins could force user confirmation without depending on risk classification.

The gap lived in the absence of ask-routing logic in `PermissionGate.check()`. Without it, hooks could set `status: 'ask'` but the gate would ignore it and proceed with default policy.

## Decision

Promoted a first-class 3-state decision model by:

1. **Extended `Decision` type** (`src/permissions/types.ts:7-13`):
   - Added `status: PermissionDecisionStatus` as an explicit field
   - Kept `approved: boolean` as a backward-compatibility alias (mirrors `status === 'allow'`)
   - Added `source: PermissionDecisionSource` to track whether decision came from hook, user, or default policy

2. **Implemented `ask` semantics in `PermissionGate.check()`** (`src/permissions/gate.ts`):
   - If `hookStatus === 'ask'` (or if default policy decides `ask` for a given risk/tool), route through the same `ws.requestApproval(...)` mechanism used for high-risk decisions
   - Preserve existing timeout behavior (`PermissionGate.timeoutMs`)
   - Fail closed if no WebSocket is available
   - Emit resolved status consistently with the final outcome

3. **Updated hook typing** (`src/hooks/types.ts`):
   - Widened `ApprovalRequest.risk` from `'high'` literal to `Risk` union to support ask for any risk level
   - No new hook events required for this P0; lifecycle split can be P1

### Files modified
- `src/permissions/types.ts` — Extended `Decision` interface to include `status` and `source` fields (lines 7-13); added `statusFromApproval()` helper (lines 15-19)
- `src/permissions/gate.ts` — Refactored `check()` to route `ask` decisions through WebSocket approval flow regardless of risk level; updated decision construction to set `status` and `source` consistently
- `src/permissions/gate.test.ts` — Added 4 new tests covering hook ask for low-risk tools, hook ask denial, hook ask for high-risk tools, and ask routing with WebSocket approval

### Commit(s)
903f353: feat(permissions): Route explicit ask decisions through approval

## Consequences

### Positive
- Hooks can now force user approval without depending on high-risk classification
- Decision state is auditable: `status` is explicit and `source` tracks origin
- Medium-risk defaults remain configurable, but the code-path supports ask without special-casing to `risk==='high'`
- First-class ask semantics enable durable "approved ruleset" patterns

### Negative / accepted trade-offs
- `approved: boolean` is now derived from `status` rather than primary; code reading `approved` still works but `status` is the source of truth
- WebSocket approval flow is now used for any risk level if ask is requested; this could increase user prompts if plugins are aggressive with ask

### Backward compatibility
Existing code reading `Decision.approved` continues to work (it mirrors `status === 'allow'`). Existing hooks that return `status: 'allow'` or `status: 'deny'` work unchanged. New behavior: hooks returning `status: 'ask'` now trigger WebSocket approval for any risk level, which is the intended behavior.

## Evidence

- [Mechanism: opencode-dev](../../markdown-db/06-mechanisms/opencode-dev.md) — explicit permission actions `allow|deny|ask` and Deferred ask flow (opencode-dev.md:116-162)
- [Mechanism: claude-code](../../markdown-db/06-mechanisms/claude-code.md) — allow/ask/deny is the core primitive, wrapped by permission modes (claude-code.md:187-220)
- [Research: permission-hook-systems](../../markdown-db/07-research/permission-hook-systems.md) — calls out Elefant's "3-state exists in types but ask is not implemented" and recommends making ask first-class (P0) (permission-hook-systems.md:32-52, :124-143, :197-205)

## Follow-ups

This refinement completes the permission decision layer (R3 explicit ask/allow/deny). Future work (P1) includes adding hook timeouts and AbortSignal propagation for reliability (R7).

---

*Captured during Wave 8 of the agent-harness-research workflow.*
