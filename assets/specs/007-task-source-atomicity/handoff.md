<!-- markdownlint-disable-file -->

# Handoff — `007-task-source-atomicity`

**Spec:** `assets/specs/007-task-source-atomicity/`
**Branch:** `007-task-source-atomicity`
**Release:** v0.x target

## Agent prompt

```text
Implement spec 007-task-source-atomicity with source-truthful mutation semantics.
Read spec.md (TSA-1..TSA-3), plan.md, and tasks.md before coding.

Required scope:
  - Source-first mutation completion contract:
      success only after source persistence succeeds.
  - Explicit conflict rejection for stale concurrent writes.
  - Projection consistency protection when source write fails.
  - Structured mutation-aware failure outcomes and diagnostics.
  - No FCIS boundary violations and no Zod/Drizzle introduction.

Primary code surfaces:
  - src/shell/main/rpc/routes/task.routes.ts
  - src/shell/app/lib/app_task_source.util.ts
  - src/shell/app/db/task.repository.ts
  - src/shell/app/app.service.ts

Before done, run:
  mise run spec audit assets/specs/007-task-source-atomicity --strict
  /speckit-analyze 007-task-source-atomicity
  mise run spec ready assets/specs/007-task-source-atomicity --key task-source-atomicity
```

## Acceptance criteria tracker

| ID | Done when | Evidence |
| --- | --- | --- |
| TSA-1 AC1 | Successful source writes return success for create/update/delete/reorder | `bun test src/shell/main/rpc/routes/task.routes.spec.ts --filter success` |
| TSA-1 AC2 | Source-write failures return non-success outcome with mutation-aware message | `bun test src/shell/main/rpc/routes/task.routes.spec.ts --filter failure` |
| TSA-1 AC3 | No success acknowledgement emitted when source persistence fails | `bun test src/shell/app/lib/app_task_source.util.spec.ts --filter no-success-on-failure` |
| TSA-2 AC1 | Projection remains unchanged/restored when source persistence fails | `bun test src/shell/app/db/task.repository.spec.ts --filter projection` |
| TSA-2 AC2 | Projection matches source-derived expected state on source success | `bun test src/shell/app/db/task.repository.spec.ts --filter reconcile` |
| TSA-2 AC3 | Sync-after-failure does not produce unexpected reversal | `bun test src/shell/app/app.service.spec.ts --filter sync` |
| TSA-2 AC4 | Completion order is source-first then projection update | `bun test src/shell/app/lib/app_task_source.util.spec.ts --filter ordering` |
| TSA-2 AC5 | Conflicting second write is rejected explicitly | `bun test src/shell/main/rpc/routes/task.routes.spec.ts --filter conflict` |
| TSA-3 AC1 | Structured failure record includes mutation type + correlation context | `bun test src/shell/app/lib/app_task_source.util.spec.ts --filter diagnostics` |
| TSA-3 AC2 | Repeated failures are distinguishable by correlation value | `bun test src/shell/main/rpc/routes/task.routes.spec.ts --filter correlation` |
| TSA-3 AC3 | No failure-specific diagnostics on success-only runs | `bun test src/shell/main/rpc/routes/task.routes.spec.ts --filter success-diagnostics` |

## Operator markers

Create these marker files as phases complete:

- `checklists/analyze-plan.md`
- `checklists/analyze-tasks.md`
- `checklists/implement-done.md`

## Verification evidence pointers

- Strict audit command and expected outcome:
  - `mise run spec audit assets/specs/007-task-source-atomicity --strict`
  - Expected: `Spec audit clean — 007-task-source-atomicity`
- Analyze phase markers that must exist before implementation handoff closes:
  - `assets/specs/007-task-source-atomicity/checklists/analyze-plan.md`
  - `assets/specs/007-task-source-atomicity/checklists/analyze-tasks.md`

## Delivery notes

- Keep task mutation outcomes deterministic and source-truthful.
- Preserve existing sync algorithm intent; no hidden behavior expansions.
- Keep user-safe messaging while retaining maintainer diagnostics via structured logs.
