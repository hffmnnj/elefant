# ADR-0001: Tool argument validation at registry

**Status:** Accepted
**Date:** 2026-04-28
**Workflow:** agent-harness-research
**Recommendation:** [R1](../../markdown-db/07-research/HARNESS-RECOMMENDATIONS.md)
**MH:** MH8

## Context

Elefant's ToolRegistry previously passed `args: unknown` directly into `tool.execute(args)` without centrally validating against the tool's declared `parameters` schema. This pushed validation burden into each tool implementation, leading to inconsistent error messages, malformed tool calls reaching execution, and missed default value application. Reference harnesses (OpenCode, Pi) place a single fail-closed validation choke point at the registry boundary and return an LLM-readable "rewrite the tool call to satisfy schema" error so the model can self-repair.

The gap lived in `src/tools/registry.ts:109-167` (tool execution path) and `src/types/tools.ts:8-20` (ParameterDefinition schema). Without central validation, tools either silently accepted invalid args or threw exceptions that didn't guide the LLM toward correction.

## Decision

Added a `validateToolArgs()` helper function in `src/tools/registry.ts` that validates raw arguments against a tool's declared parameters before execution. The validation:

1. Requires args to be an object (non-null, non-array)
2. Enforces `required: true` fields are present
3. Enforces primitive `type` matches (`string|number|boolean|object|array`)
4. Applies `default` values when fields are missing
5. Returns a `Result<Record<string, unknown>, ElefantError>` with a `VALIDATION_ERROR` code on failure

On validation failure, the error is returned with an explicit message: `"The \"<tool>\" tool was called with invalid arguments: <reason>. Please rewrite the input so it satisfies the expected schema."` This error is also emitted via the `tool:after` hook with `isError: true` before returning to the LLM.

### Files modified
- `src/tools/registry.ts` — Added `validateToolArgs()` helper (lines 141-175) and `matchesParameterType()` type checker (lines 119-132); integrated validation into `ToolRegistry.execute()` before tool invocation
- `src/tools/registry.test.ts` — Added 4 new validation tests covering missing required fields, type mismatches, default application, and valid args

### Commit(s)
No dedicated commit; landed inside Wave 4 (task 4.1)

## Consequences

### Positive
- Invalid tool-call args never reach `tool.execute()`, preventing silent failures or tool-specific error handling
- Defaults in `ParameterDefinition.default` are applied consistently at the registry boundary
- LLM receives clear, actionable error messages that guide rewriting the tool call
- Validation is centralized and testable, reducing per-tool validation logic

### Negative / accepted trade-offs
- Adds a small validation overhead to every tool call (negligible for most tools)
- Validation is limited to primitive types; complex schema validation (nested objects, unions) would require a schema library (deferred to future work)

### Backward compatibility
Existing tool implementations continue to work unchanged. Tools that previously did their own validation will now receive pre-validated args, which is strictly safer. The validation error format is new and will be seen by the LLM on malformed calls, which is the intended behavior.

## Evidence

- [Mechanism: opencode-dev](../../markdown-db/06-mechanisms/opencode-dev.md) — Zod parse-gate before execution and LLM-facing "rewrite to satisfy schema" error (opencode-dev.md:48-62)
- [Mechanism: pi-mono](../../markdown-db/06-mechanisms/pi-mono.md) — prepare/validate at loop boundary; failures become immediate error tool results (pi-mono.md:93-126)
- [Research: tool-call-protocols](../../markdown-db/07-research/tool-call-protocols.md) — identifies Elefant's missing central validation gate as a protocol gap (tool-call-protocols.md:37-45, :163-168)

## Follow-ups

R5 (tool output truncation at registry) builds on this validation layer, ensuring both input and output are shaped at the registry boundary for consistent tool-call protocol enforcement.

---

*Captured during Wave 8 of the agent-harness-research workflow.*
