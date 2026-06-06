# Handoff — `003-sync-frecency-preserve`

**Spec:** `assets/specs/003-sync-frecency-preserve/`
**Branch:** `003-sync-frecency-preserve`
**Release:** v0.10.0

## Agent prompt

```text
Implement spec 003-sync-frecency-preserve. Read spec.md, plan.md, tasks.md, handoff.md,
contracts/sync-learned-state.md, and data-model.md.

Work tasks.md in phase order. Phase 2 (snapshot + sync wiring) blocks green integration tests.
Partial-failure test (SF-3 AC4): use optional test-only hooks on runSourceImportSync args —
see plan.md Testing strategy.

Before done:
  mise run test tag sync_frecency_preserve
  mise run spec lint --strict
  mise run spec trace --feature 003-sync-frecency-preserve
  bash .agents/skills/app-quality-gate/scripts/gate.sh
```

## Acceptance criteria tracker

| ID       | Done when                                                                 | Evidence                                               |
| -------- | ------------------------------------------------------------------------- | ------------------------------------------------------ |
| SF-1 AC1 | List order for surviving entries matches pre-sync ranking after full sync | `bun test src/shell/app/lib/app_sync_frecency.spec.ts` |
| SF-1 AC2 | Entry removed from sources is absent from list; remaining order unchanged | `bun test src/shell/app/lib/app_sync_frecency.spec.ts` |
| SF-1 AC3 | New entry ranks below frequently used entries until first open            | `bun test src/shell/app/lib/app_sync_frecency.spec.ts` |
| SF-2 AC1 | Binding usage scores unchanged for surviving shortcuts after sync         | `bun test src/shell/app/lib/app_sync_frecency.spec.ts` |
| SF-2 AC2 | Removed shortcut absent; remaining shortcut order unchanged               | `bun test src/shell/app/lib/app_sync_frecency.spec.ts` |
| SF-3 AC1 | Existing sync/import integration tests pass unchanged                     | `bun test src/shell/app` (sync-related specs)          |
| SF-3 AC2 | YAML edits reflected in catalog; entry/binding usage preserved            | `bun test src/shell/app/lib/app_sync_frecency.spec.ts` |
| SF-3 AC3 | Sync completes in one UI operation (no extra app restart)                 | Operator smoke below — pending human run               |
| SF-3 AC4 | Partial import: catalog at failure point; usage matches pre-sync snapshot | `bun test src/shell/app/lib/app_sync_frecency.spec.ts` |

## Operator smoke (SF-3 AC3)

Run after implementation (see also [quickstart.md](./quickstart.md)):

1. `mise run app dev` (or project dev task).
2. Open several entries so frequently used items rise in the list.
3. Edit a YAML source (title tweak; remove one entry).
4. Trigger sync from the UI once.
5. **Pass:** updated titles visible; removed entry gone; frequent entries still near the top; no second restart or second sync required.

Record result in this table (date / operator / pass-fail) before merge.

| Date       | Operator | Pass                                     |
| ---------- | -------- | ---------------------------------------- |
| 2026-06-03 | —        | Pending — run quickstart.md manual smoke |

## E2e (stretch)

Integration spec is the release gate. Gherkin pilot:
`assets/features/e2e/sync_frecency.feature` (`@sync_frecency_preserve`). Step-catalog and
fixture-manifest updates deferred until e2e steps are implemented.
