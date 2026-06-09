<!-- markdownlint-disable-file -->

# Handoff — `008-task-mutation-failure-ux`

**Spec:** `assets/specs/008-task-mutation-failure-ux/`
**Branch:** `008-task-mutation-failure-ux`
**Release:** v0.x target

## Agent prompt

```text
Implement spec 008-task-mutation-failure-ux end-to-end.
Read spec.md (TMF-1..TMF-8), plan.md, and tasks.md before coding.

Required scope:
  - Renderer treats `TaskMutationOutcome.ok === false` as non-success:
      keep task sheet open, set explicit error state, no implied success.
  - Keyboard/list task mutations use one list-level visible error surface.
  - Atomicity e2e scenarios use real preview -> RPC -> AppService transport.
  - Fault injection remains env-gated and preview/e2e-only (no header toggles).
  - Atomicity scenarios use feature-local task data (no shared release-title dependency).
  - Atomicity BDD helpers split into feature-scoped step/screenplay modules.
  - Add 008 spec pointer under existing catalog key `task_source_atomicity`.
  - H0 harness: feature inference, slice validation (hk + lint --strict), workflow run.

Primary code surfaces:
  - src/shell/renderer/hooks/list/use_task_sheet.hook.ts
  - src/shell/renderer/hooks/list/use_task_keyboard.hook.ts
  - src/shell/renderer/hooks/list/use_list_page_shell.hook.ts
  - src/shell/renderer/components/task/task_sheet.component.tsx
  - src/shell/renderer/components/list/list_main.component.tsx
  - src/shell/main/rpc/routes/task.routes.ts
  - bdd/e2e/steps/task_management.steps.ts
  - bdd/e2e/steps/task_source_atomicity.steps.ts
  - bdd/e2e/screenplay/task_crud.task.ts
  - bdd/e2e/screenplay/task_source_atomicity.task.ts
  - assets/features/e2e/task-source-atomicity.feature
  - assets/catalog/catalog.yaml
  - tools/governance/specs/resolve_active_feature_dir.util.ts
  - tools/governance/specs/resolve_catalog_key.util.ts
  - tools/governance/specs/workflow/workflow_run.script.ts
  - tools/governance/specs/workflow/phase.script.ts

Before done, run:
  mise run spec audit assets/specs/008-task-mutation-failure-ux --strict
  /speckit-analyze 008-task-mutation-failure-ux
  mise run spec ready assets/specs/008-task-mutation-failure-ux --key task_source_atomicity
```

## Acceptance criteria tracker

| ID | Done when | Evidence |
| --- | --- | --- |
| TMF-1 AC1 | Task sheet stays open and does not call close callback on `ok: false` | `bun test src/shell/renderer/hooks/list/use_task_sheet.hook.spec.ts --filter open` |
| TMF-1 AC2 | Task sheet sets `form.error` from server message or fallback template | `bun test src/shell/renderer/hooks/list/use_task_sheet.hook.spec.ts --filter error` |
| TMF-1 AC3 | `ok: true` path still closes and refreshes happy path behavior | `bun test src/shell/renderer --filter task_sheet` |
| TMF-1 AC4 | Cycle status/priority failures do not advance local state | `bun test src/shell/renderer/hooks/list/use_task_sheet.hook.spec.ts --filter cycle` |
| TMF-1 AC5 | Keyboard/list failures surface one consistent list-level error pattern | `bun test src/shell/renderer/hooks/list/use_list_page_shell.hook.spec.ts --filter list-level` |
| TMF-2 AC1 | Create fault injection returns `ok: false` + `source_write_failed` via real route | `bun test src/shell/main/rpc/routes/task.routes.spec.ts --filter source_write_failed` |
| TMF-2 AC2 | Update fault injection returns explicit `conflict` with version fields | `bun test src/shell/main/rpc/routes/task.routes.spec.ts --filter conflict` |
| TMF-2 AC3 | Inactive injection preserves shipped 007 defaults | `bun test src/shell/main/rpc/routes/task.routes.spec.ts --filter default` |
| TMF-2 AC4 | Env-unset ignores injection and production does not honor it | `bun test src/shell/main/rpc/routes/task.routes.spec.ts --filter env` |
| TMF-2 AC5 | Atomicity steps do not synthesize mutation outcomes with route interception | `mise run test tag task_source_atomicity --e2e` |
| TMF-2 AC6 | Failure assertions target visible UI, not interception recall | `mise run test tag task_source_atomicity --e2e` |
| TMF-3 AC1 | Focused unit/route command matches harness | `assets/specs/008-task-mutation-failure-ux/quickstart.md` |
| TMF-3 AC2 | Focused e2e command uses `mise run test tag task_source_atomicity --e2e` | `assets/specs/008-task-mutation-failure-ux/quickstart.md` |
| TMF-3 AC3 | Ready command uses 008 dir + key `task_source_atomicity` | `assets/specs/008-task-mutation-failure-ux/quickstart.md` |
| TMF-3 AC4 | Fault injection docs name env gate + preview-only scope | `assets/specs/008-task-mutation-failure-ux/quickstart.md` |
| TMF-4 AC1 | Scenario no longer depends on `Release Todo Task` title | `assets/features/e2e/task-source-atomicity.feature` |
| TMF-4 AC2 | Atomicity survives unrelated release fixture task-title rename | `mise run test tag task_source_atomicity --e2e` |
| TMF-4 AC3 | Feature-local seeding pattern documented | `mise run test tag task_source_atomicity --e2e` |
| TMF-5 AC1 | Generic step module excludes atomicity-only steps | `bdd/e2e/steps/task_management.steps.ts` |
| TMF-5 AC2 | Atomicity screenplay helpers live in dedicated module | `bdd/e2e/screenplay/task_source_atomicity.task.ts` |
| TMF-5 AC3 | bddgen and tagged e2e pass without duplicate/orphaned steps | `bun run bdd:e2e:bddgen && mise run test tag task_source_atomicity --e2e` |
| TMF-6 AC1 | Feature inference — resolveActiveFeatureDir resolves from arg, .specify/feature.json, branch, or cwd | `bun test ./tools/governance/specs/resolve_catalog_key.util.spec.ts` |
| TMF-6 AC2 | Feature inference — resolveCatalogKey derives or looks up key | `bun test ./tools/governance/specs/resolve_catalog_key.util.spec.ts` |
| TMF-7 AC1 | Slice validation — `phase` subcommand runs hk fix + lint --strict | `mise run spec lint --strict` |
| TMF-8 AC1 | Workflow run — `workflow_run` dispatches orchestrated-handoff with flag forwarding | `tools/governance/specs/workflow/workflow_run.script.spec.ts` |

## Operator markers

Create these marker files as phases complete:

- `checklists/analyze-plan.md`
- `checklists/analyze-tasks.md`
- `checklists/implement-done.md`

## Verification evidence pointers

- Strict audit command and expected outcome:
  - `mise run spec audit assets/specs/008-task-mutation-failure-ux --strict`
  - Expected: `Spec audit clean — 008-task-mutation-failure-ux`
- Analyze phase markers expected before implementation handoff closes:
  - `assets/specs/008-task-mutation-failure-ux/checklists/analyze-plan.md`
  - `assets/specs/008-task-mutation-failure-ux/checklists/analyze-tasks.md`

## Delivery notes

- Preserve 007 mutation contract: no route-shape or write-order regression.
- Keep TypeBox-only validation and FCIS import boundaries intact.
- Keep failure UX truthful and visible while preserving happy-path behavior.
- TMF-6/7/8 (H0 harness) specs run with explicit `bun test ./tools/governance/...` — not auto-discovered under `src/`.
