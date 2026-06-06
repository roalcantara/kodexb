# Quickstart: Sync frecency preserve

**Feature**: `003-sync-frecency-preserve` | **Branch**: `003-sync-frecency-preserve`

## Read first

| Doc                                                                  | Purpose                      |
| -------------------------------------------------------------------- | ---------------------------- |
| [spec.md](./spec.md)                                                 | EARS requirements SF-1..SF-3 |
| [plan.md](./plan.md)                                                 | Design + file touch list     |
| [data-model.md](./data-model.md)                                     | Tables + restore rules       |
| [contracts/sync-learned-state.md](./contracts/sync-learned-state.md) | Sync phase invariants        |
| [handoff.md](./handoff.md)                                           | AC tracker + operator smoke  |

## Code map

| Area                             | Path                                              |
| -------------------------------- | ------------------------------------------------- |
| Sync entrypoint                  | `src/shell/app/app.ts` → `sync()`                 |
| Rebuild pipeline                 | `src/shell/app/lib/app_sync.util.ts`              |
| Snapshot (to implement)          | `src/shell/app/lib/frecency_snapshot.util.ts`     |
| Integration tests (to implement) | `src/shell/app/lib/app_sync_frecency.spec.ts`     |
| Entry visits                     | `src/shell/app/db/frecency.repository.ts`         |
| Binding visits                   | `src/shell/app/db/binding_frecency.repository.ts` |
| List sort SQL                    | `src/shell/app/db/entry_repository.const.ts`      |

## Implementer checklist

1. Add `exportLearnedSnapshot(db)` / `restoreLearnedSnapshot(db, snapshot)` with filtered upserts.
2. Wire into `runSourceImportSync` (export before `closeDb`, restore after `ImportService.run`, `finally` on throw).
3. Add co-located `frecency_snapshot.util.spec.ts` for export/restore filtering.
4. Add `app_sync_frecency.spec.ts` covering SF-1..SF-3 Evidence paths.
5. Run `bun test src/shell/app/lib/app_sync_frecency.spec.ts` then `bash .agents/skills/app-quality-gate/scripts/gate.sh`.

## Manual smoke (after implementation)

1. `mise run app dev` (or project dev task).
2. Open several entries to build list frecency.
3. Edit a YAML source (title tweak + remove one entry).
4. Trigger sync from UI.
5. Confirm: updated titles, removed entry gone, frequent entries still near top.

## Spec Kit next steps

```text
/speckit-implement
/speckit-checklist
/speckit-analyze
```

Update `handoff.md` manually when tasks or acceptance criteria change.

## Gates before merge

```bash
mise run test tag sync_frecency_preserve --list
mise run test tag sync_frecency_preserve
mise run catalog ship sync_frecency_preserve
mise run spec lint assets/specs/003-sync-frecency-preserve --strict
mise run spec trace assets/specs/003-sync-frecency-preserve --strict
mise run spec gate assets/specs/003-sync-frecency-preserve
```
