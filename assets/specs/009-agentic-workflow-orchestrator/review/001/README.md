<!-- markdownlint-disable-file -->

# Review — `009-agentic-workflow-orchestrator`

In-flight review artifacts for spec rework. **Normative truth** remains in
[`assets/guides/`](../../../../guides/) and [`assets/catalog/`](../../../../catalog/)
per [`DOC_AUTHORITY.md`](../../../../guides/DOC_AUTHORITY.md). Files here are
**task-scoped** to this feature folder and may be archived after ship.

| File                                                 | Audience             | Purpose                                                |
| ---------------------------------------------------- | -------------------- | ------------------------------------------------------ |
| [`guides-first-review.md`](./guides-first-review.md) | Operator / architect | Actionable review anchored on guides, not legacy specs |
| [`spec-rework.handoff.md`](./spec-rework.handoff.md) | Implementer agents   | Concrete rework checklist and agent prompt             |

**Related:** [`../spec.md`](../spec.md), [`../data-model.md`](../data-model.md),
[`../contracts/`](../contracts/)

**Next pass:** [`../002/README.md`](../002/README.md) — tool-agnostic engine
boundary (Executor port, profile-owned `execution_policy`, ENGINE/PROFILE/CLI
task split).

## Changelog — rework 001 (applied 2026-06-09)

Guides-first rework applied per [`guides-first-review.md`](./guides-first-review.md)
and [`spec-rework.handoff.md`](./spec-rework.handoff.md). What changed:

- **Authority & guide promotion** section added to `spec.md` (guide-promotion checklist; spec declared ephemeral; `contracts/` declared a spike with a promotion rule).
- **Worker transport rewritten** — replaced the "Speckit stages callable programmatically" assumption with the guides-native model (artifact gates + checklist markers, declared-command verification, opencode dispatch at documented seams). Updated `Introduction`, `AWO-5` AC1, and `Assumptions`.
- **Delivery slices** — one spec, five PRs (substrate-first): MVP (AWO-2, 9, 10, 4, 12) → M1 (AWO-1, 5, 13) → M2 (AWO-3, 7) → M3 *(Post-MVP)* AWO-6 → M4 *(Post-MVP)* AWO-8, 11. Per-requirement **Slice:** banners added. `plan.md` created with slice → requirement → PR → guide table.
- **Package boundary** documented forward-looking (implement under `tools/governance/workflow/`, promote to `packages/workflow-*`; renderer never imports the runtime). Reconciled stray `src/core/workflow` / `src/shell/app/workflow` references to the implementation home.
- **E2E table replaced** with Layer A/B/C enforcement; dropped `@agentic_workflow_orchestrator` as a product catalog tag; fixtures moved to `tools/__tests__/fixtures/workflow/`.
- **Default profile** noted as an MVP plan deliverable replaying the SDD phase order.
- **Nits fixed:** `events.jsonl` → `.ndjson` and sibling-flat path shape in the NFR table and OQ-1; removed the undefined `N` in AWO-3 AC1; fixed the `WORKFLOW_OBSERVABILITY_GUIDE.md` link that pointed back into this in-flight spec.

No runtime code written; no commit made (per handoff DoD).

## Changelog — rework 002 (applied 2026-06-09)

Second-pass considerations (implementation-path reality check):

- **Path correction (verified bug).** The shipped workflow code lives at `tools/governance/specs/workflow/` (`workflow_run.script.ts` with `WorkflowRunWriter` + `WorkflowEvent` union, `orchestrated_handoff.script.ts` with `detectPhase()`, `runs_cli`, `handoff_generate`). The rework-001 docs invented `tools/governance/workflow/`. Corrected across `spec.md`, `plan.md`, `data-model.md`, `contracts/`, and `WORKFLOW_OBSERVABILITY_GUIDE.md`. Renamed the spec section to **Implementation home & package boundary** (fixed the dependent anchor).
- **Reuse narrative added to `plan.md`.** Explicit: *extend* the existing `WorkflowEvent` union + `WorkflowRunWriter` (AWO-12/AWO-4) and *compose* `detectPhase()` as the Layer-B input / M1 guard — do not fork a second writer or detector.
- **`packages/workflow-*` demoted.** Now an optional, trigger-gated later extraction, not the default promotion path; this feature extends the existing tree in place.
- **Input scope qualifier (line 9).** Added a one-sentence "full vision; MVP ships substrate only" note so PR 1 is not over-scoped.
- **AWO-2 AC ownership.** Banner now notes AC1–2 ship MVP (validated in isolation), AC3–4 land M1; `tasks.md` carries `MVP-` component-only tasks. (No new spec churn; `tasks.md` authoring deferred to the next SDD phase.)

Verification: `mise run spec lint` 0 errors; no stale `tools/governance/workflow/` refs in spec/plan/data-model/contracts/guide; no dead anchors. No commit made.
