# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) for Elefant's agent harness. ADRs document significant architectural decisions, their context, rationale, and consequences.

ADRs are **append-only**: once accepted, they are never edited. If a decision is superseded, a new ADR is created that references the previous one. This preserves the decision history and rationale for future reference.

## Index

| # | Title | Status | Date | Workflow |
|---|-------|--------|------|----------|
| [0001](0001-tool-arg-validation-at-registry.md) | Tool argument validation at registry | Accepted | 2026-04-28 | agent-harness-research |
| [0002](0002-tool-output-truncation-at-registry.md) | Tool output truncation at registry boundary | Accepted | 2026-04-28 | agent-harness-research |
| [0003](0003-parent-child-cancellation-propagation.md) | Parent → child cancellation propagation | Accepted | 2026-04-28 | agent-harness-research |
| [0004](0004-explicit-allow-ask-deny-permissions.md) | Explicit allow / ask / deny permission decisions | Accepted | 2026-04-28 | agent-harness-research |
| [0005](0005-compaction-lifecycle-and-tool-call-guard.md) | Compaction lifecycle hooks + tool-call guard | Accepted | 2026-04-28 | agent-harness-research |

## How to Add an ADR

1. **Number sequentially**: The next ADR is 0006.
2. **Copy the template**: Use any existing ADR as a template (e.g., [0001](0001-tool-arg-validation-at-registry.md)).
3. **Fill in the sections**:
   - **Context**: The problem this decision solves. Cite specific file:line references.
   - **Decision**: What was changed. Name functions, types, files. Cite commit SHA if applicable.
   - **Consequences**: Positive and negative outcomes. Be honest about trade-offs.
   - **Evidence**: Cross-references to research or mechanism files that informed the decision.
   - **Follow-ups**: Any P1/P2 items that depend on this decision.
4. **Link from this README**: Add a row to the index table above.
5. **Never edit**: Once merged, the ADR is immutable. Create a new ADR if the decision changes.

## Related Documents

- [HARNESS-RECOMMENDATIONS.md](../../markdown-db/07-research/HARNESS-RECOMMENDATIONS.md) — The research gate that informed these ADRs
- [MASTER-SYNTHESIS.md](../../markdown-db/05-synthesis/MASTER-SYNTHESIS.md) — Strategic synthesis of the agent-harness-research workflow
- [CHRONICLE.md](../../.goopspec/agent-harness-research/CHRONICLE.md) — Wave-by-wave execution log

---

*ADRs captured during Wave 8 of the agent-harness-research workflow.*
