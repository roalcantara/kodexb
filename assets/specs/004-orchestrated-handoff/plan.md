<!-- markdownlint-disable-file -->

# Plan — `004-orchestrated-handoff`

**Spec:** [`spec.md`](./spec.md) — requirements OHW-1 … OHW-8.

This plan is pointer-only per [`WORKFLOW_SDD_GUIDE.md` § Normative quartet](../../guides/WORKFLOW_SDD_GUIDE.md#normative-quartet).
It does not copy EARS AC text; tasks reference requirement IDs.

## Design contract

The feature ships in three orthogonal pieces:

1. **Workflow YAML + catalog registration** (OHW-1, OHW-3 AC2/AC3, A4)
   `.specify/workflows/orchestrated-handoff/workflow.yml` defines the full SDD
   cycle with dual `speckit.analyze` passes and human gates around `spec`,
   `plan`, `tasks`, handoff-emit, and final review. This YAML is the **Spec Kit
   canonical path** — it is what `specify workflow run orchestrated-handoff`
   executes. Checklist markers (`checklists/analyze-plan.md`,
   `checklists/analyze-tasks.md`, `checklists/implement-done.md`) serve as
   **orchestrator resume markers**: the `mise run spec workflow … --next`
   command reads them rather than re-parsing YAML step completion.

2. **Bun handoff generator** (OHW-2, OHW-4, OHW-7 AC3, OHW-8 AC4)
   `tools/governance/specs/workflow/handoff_generate.script.ts` parses
   `handoff.md`'s AC table, derives slice ids via
   `tools/governance/registries/catalog/tag.script.ts#sliceIdFromAcTag`, and
   renders `tmp/handoffs/opencode-{slug}-{focus}.md`. Dispatch to
   `opencode run` is opt-in via `--dispatch` / `ORCHESTRATED_HANDOFF_DISPATCH=1`
   with stdin / argv-fallback per body size.

3. **Bun orchestrator** (OHW-3, OHW-6 AC1, A1, A2, A3)
   `tools/governance/specs/workflow/orchestrated_handoff.script.ts` implements
   `--next`, `--manifest`, and `--lint`. `--next` is gated by a
   manifest probe (`buildSubtaskManifest`) so unit-only features skip the
   handoff-emit transition.

Mise wiring lives in [`mise.toml`](../../../mise.toml) under
`[tasks."spec"]` (`workflow`, `handoff-generate`) and dispatched from
[`tools/bin/spec.script.ts`](../../../tools/bin/spec.script.ts).

## Traceability

| Requirement | Artifact                                                           |
| ----------- | ------------------------------------------------------------------ |
| OHW-1       | `.specify/workflows/orchestrated-handoff/workflow.yml`, `.specify/workflow-catalogs.yml` |
| OHW-2       | `tools/governance/specs/workflow/handoff_generate.script.ts`       |
| OHW-3       | `tools/governance/specs/workflow/orchestrated_handoff.script.ts`   |
| OHW-4       | `dispatchToOpencode()` in `handoff_generate.script.ts`             |
| OHW-5       | `assets/guides/WORKFLOW_SDD_GUIDE.md` § orchestrated-handoff, `.specify/memory/constitution.md` analyze footnote |
| OHW-6       | `runLint()` in orchestrator + guide § Review-spec gate             |
| OHW-7       | Guide § Plan skill routing + handoff-generate prompt template      |
| OHW-8       | Guide § Normative quartet + plan template trim + this file (no satellites) + handoff-generate slice-section trim |

## File touch list

- `assets/specs/004-orchestrated-handoff/spec.md`
- `assets/specs/004-orchestrated-handoff/plan.md`
- `assets/specs/004-orchestrated-handoff/tasks.md`
- `assets/specs/004-orchestrated-handoff/handoff.md`
- `.specify/workflows/orchestrated-handoff/workflow.yml`
- `.specify/workflow-catalogs.yml`
- `.specify/memory/constitution.md`
- `.specify/templates/plan-template.md`
- `tools/governance/specs/workflow/handoff_generate.script.ts`
- `tools/governance/specs/workflow/handoff_generate.script.spec.ts`
- `tools/governance/specs/workflow/orchestrated_handoff.script.ts`
- `tools/governance/specs/workflow/orchestrated_handoff.script.spec.ts`
- `tools/governance/specs/workflow/sdd_guide_content.script.spec.ts`
- `tools/governance/specs/workflow/usage.script.ts`
- `tools/bin/spec.script.ts`
- `mise.toml`
- `assets/guides/WORKFLOW_SDD_GUIDE.md`
- `tools/governance/specs/PLAN_PUNCHLIST.md`

## Non-functional constraints

Per OHW spec § Performance / non-functional notes: generator under 250ms on a
typical handoff; works offline; Bun built-ins only (no new runtime deps).

## Out of scope

See [`spec.md` § Out of scope](./spec.md). Optional Spec Kit satellites
(`research.md`, `data-model.md`, `contracts/`, `quickstart.md`) are
**intentionally absent** from this directory per OHW-8 AC3.
