# Implementation Plan: Task mutation failure UX

**Branch**: `008-task-mutation-failure-ux` | **Date**: 2026-06-09 | **Spec**: `assets/specs/008-task-mutation-failure-ux/spec.md`

**Input**: Feature specification from `assets/specs/008-task-mutation-failure-ux/spec.md`

## Summary

Complete the 007 acceptance loop at the UI and e2e layers. The renderer must treat
`TaskMutationOutcome.ok === false` as a first-class outcome (keep dialogs open, surface
honest errors, never imply success); atomicity e2e must exercise the real preview → RPC →
AppService path using env-gated backend fault injection instead of Playwright
`route.fulfill`; verification docs, scenario data, and BDD module boundaries are corrected.
Mutation semantics, write order, and outcome JSON shape are inherited from 007 unchanged.

## Feature deltas

| Topic | Delta |
| ----- | ----- |
| Renderer | Outcome-aware save in `use_task_sheet.hook.ts`; one list-level error surface for keyboard/list mutations (OQ-1); dialog mutations keep dialog-local `form.error` |
| RPC | Env-gated test-only fault injection in `task.routes.ts` for create (`source_write_failed`) and update (`conflict`); no new routes, no changed defaults (OQ-2) |
| Fault injection | Enabled only via preview/e2e env allowlist (e.g. `KB_E2E_FAULT_INJECTION=1`); request-header toggles unsupported; Electrobun production builds ignore injection (OQ-2) |
| E2e transport | Atomicity Givens stop using `route.fulfill`; assertions target visible UI; screenplay drops `lastTaskMutationOutcome` recall workaround |
| Scenario data | Atomicity scenarios seed/select feature-local task data, not shared `Release Todo Task` |
| BDD structure | Split atomicity steps into `task_source_atomicity.steps.ts`; split screenplay into `task_source_atomicity.task.ts` |
| Docs | `quickstart.md` corrected to repo harness commands and catalog key `task_source_atomicity` |
| Catalog | Add `008-task-mutation-failure-ux` as an additional spec pointer under existing `task_source_atomicity` key — no new key (OQ-3) |
| Harness — Inference (TMF-6) | Shared `resolveActiveFeatureDir()` module in `tools/governance/specs/`; precedence: arg → `.specify/feature.json` → branch → cwd |
| Harness — Slice (TMF-7) | `mise run spec ready --phase [phase_no]` runs `hk check --profile fix` + `mise run spec lint <dir> --strict`; phase-gated trace; skips catalog/e2e/gate; `--phase` infers current slice when arg omitted |
| Harness — Workflow (TMF-8) | Default workflow name `orchestrated-handoff`; feature inference chain from TMF-6; default=run (allowlist); `--dry-run` prints |

## Technical Context

**Language/Version**: TypeScript (Bun runtime, strict TS project)

**Primary Dependencies**: Bun runtime, Elysia + Eden Treaty RPC, TypeBox validation, bun:sqlite, React 19, Playwright BDD harness

**Storage**: YAML source files (system of record) + SQLite projection (unchanged by this feature)

**Testing**: bun:test (co-located specs) + Playwright BDD e2e (`bdd/e2e`, `assets/features/e2e/*.feature`)

**Target Platform**: Electrobun desktop app (macOS + Linux); preview harness for fault injection v1

**Project Type**: Desktop application with typed RPC bridge and local persistence

**Performance Goals**: Mutation latency remains perceptibly instant; no new blocking on the keyboard path

**Constraints**: Preserve FCIS boundaries, TypeBox-only validation, no change to 007 mutation semantics/write order/outcome shape, fault injection strictly preview/e2e-scoped

**Scale/Scope**: Renderer task-mutation hooks/components, one RPC route module (fault injection), atomicity BDD steps/screenplay/feature data, and feature quickstart docs

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Pre-Phase 0 check:

1. Principle I (keyboard-first, local-first): PASS — failure UX keeps keyboard flows intact; no network dependency added.
2. Principle II (FCIS): PASS — outcome interpretation stays in renderer hook logic and shell route I/O; no forbidden imports introduced.
3. Principle III (source-of-truth honesty): PASS — primary objective is preventing false success on `ok: false`.
4. Principle IV (TypeBox-only contracts): PASS — reuses 007 `TaskMutationOutcome`; no schema-stack changes, no Zod/Drizzle.
5. Principle V (test-first evidence): PASS — every TMF AC names co-located spec or tagged e2e Evidence.
6. Principle IX (Electrobun security): PASS — fault injection is env-gated, preview/e2e-only, and excluded from production builds; no relaxation of `spec security`.

Post-Phase 1 re-check:

1. No new architecture violations introduced: PASS.
2. Requirements remain measurable/testable and implementation-neutral: PASS.
3. Planned artifacts support deterministic verification without weakening quality gates: PASS.

## Project Structure

### Documentation (this feature)

```text
assets/specs/008-task-mutation-failure-ux/
├── spec.md          # Required (/speckit-specify)
├── plan.md          # Required (this file)
├── tasks.md         # Required (/speckit-tasks)
├── handoff.md       # Required (/speckit-tasks)
└── quickstart.md    # Verification commands (TMF-3 Evidence)
```

Satellites `research.md`, `data-model.md`, and `contracts/` are intentionally omitted:
no unresolved `NEEDS CLARIFICATION` remains (OQ-1–OQ-3 resolved), the feature introduces
no new data shape, and it reuses the 007 `task-mutation-outcome.contract.md`.

### Source Code (repository root)

```text
tools/
├── bin/
│   └── spec.script.ts                       # CLI entry: ready, slice, workflow (TMF-6/7/8)
└── governance/specs/
    ├── resolve_active_feature_dir.util.ts   # shared feature inference (TMF-6 AC1–AC4)
    ├── resolve_catalog_key.util.ts          # catalog lookup + fallback (TMF-6 AC2)
    ├── phase.script.ts                      # ready --phase impl (TMF-7 AC1–AC4)
    ├── workflow_run.script.ts               # default run mode (TMF-8 AC3–AC6)
    └── workflow/
        └── orchestrated_handoff.script.ts   # existing, amended for TMF-8

src/
├── shell/
│   ├── renderer/
│   │   ├── hooks/list/
│   │   │   ├── use_task_sheet.hook.ts          # outcome-aware save + cycle failures (TMF-1 AC1–AC4)
│   │   │   ├── use_task_keyboard.hook.ts        # list-level error surface (TMF-1 AC5)
│   │   │   └── use_list_page_shell.hook.ts      # list-level error wiring (TMF-1 AC5)
│   │   └── components/
│   │       ├── task/task_sheet.component.tsx    # dialog-local error region (TMF-1 AC2)
│   │       └── list/list_main.component.tsx     # list-level error surface host (TMF-1 AC5)
│   └── main/
│       └── rpc/routes/
│           └── task.routes.ts                   # env-gated fault injection (TMF-2 AC1–AC4)

bdd/
└── e2e/
    ├── steps/
    │   ├── task_management.steps.ts             # generic steps only (TMF-5 AC1)
    │   └── task_source_atomicity.steps.ts       # NEW atomicity-only steps (TMF-5 AC1)
    ├── screenplay/
    │   ├── task_crud.task.ts                    # remove outcome-recall workaround (TMF-5 AC2)
    │   └── task_source_atomicity.task.ts        # NEW atomicity screenplay (TMF-5 AC2)
    └── support/
        └── seed_fixture.support.ts              # feature-local task seeding (TMF-4)

assets/features/e2e/
└── task-source-atomicity.feature                # real-transport Givens + feature-local data (TMF-2, TMF-4)
```

**Structure Decision**: Keep the current FCIS/Electrobun layout. Changes are confined to
existing renderer task-mutation hooks/components, one RPC route module, and atomicity BDD
assets, plus co-located specs for each touched `src/` file.

## E2e traceability

| Requirement | Feature file | Scenario | Notes |
| ----------- | ------------ | -------- | ----- |
| TMF-1, TMF-2 | `assets/features/e2e/task-source-atomicity.feature` | Task mutation reports failure on source write failure | `@spec:task-source-atomicity` |
| TMF-1, TMF-2, TMF-4 | `assets/features/e2e/task-source-atomicity.feature` | Failed mutation does not create sync reversal | `@spec:task-source-atomicity` |
| TMF-2 | `assets/features/e2e/task-source-atomicity.feature` | Mutation failure emits correlated structured diagnostics | `@spec:task-source-atomicity` |

Normative Gherkin text lives in the feature file only. No separate `@spec:task-mutation-failure-ux`
feature file is added; scenarios/steps are updated in place to satisfy TMF-1–TMF-5. Update
`assets/docs/specs/e2e/step-catalog.md` and `fixture-manifest.md` when atomicity steps/data move.

TMF-6/7/8 (harness CLI) are verified by unit/integration tests on `tools/governance/specs/` and
`tools/bin/spec.script.ts` — no Gherkin scenarios (per spec.md e2e declaration).

## Complexity Tracking

No constitution violations requiring exception tracking.
