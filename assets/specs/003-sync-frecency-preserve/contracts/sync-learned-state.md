# Contract: Learned state across full source sync

**Feature**: `003-sync-frecency-preserve` | **Type**: Internal shell invariant | **Date**: 2026-06-03

## Scope

Applies to `App.sync()` → `runSourceImportSync()` in `src/shell/app/lib/app_sync.util.ts`.
Does **not** change Eden Treaty / RPC types (`RpcImportResult`, `RpcSyncProgressPayload`).

## Preconditions

- Caller holds `App` with open SQLite connection containing current catalog + learned rows.
- `dbPath` is writable (or `:memory:` for tests).

## Operation: `runSourceImportSync`

### Phase A — Export (before DB delete)

1. Read all rows from `entry_frecency`.
2. Read all rows from `binding_frecency`.
3. Hold as `LearnedSnapshot` in memory.

### Phase B — Rebuild (unchanged)

1. `closeDb()`.
2. Delete db file + WAL/SHM when not `:memory:`.
3. Run `ImportService.run(sourcesDir)` → `RpcImportResult`.

### Phase C — Restore (after import)

1. Open database at `dbPath` (App will `closeDb` again in `sync()` finally — restore uses
   importer’s closed DB: open fresh connection for restore before returning).
2. In a transaction:
   - For each snapshot entry row: upsert **only if** `knowledges.id` exists.
   - For each snapshot binding row: upsert **only if** `entry_bindings.id` exists.
3. Return `RpcImportResult` from Phase B.

### Phase C — Failure guarantee

If Phase B throws, Phase C MUST still execute when snapshot was taken.

## Postconditions

| Condition                          | Guarantee                                                 |
| ---------------------------------- | --------------------------------------------------------- |
| Successful sync, surviving entry E | `entry_frecency` for E equals snapshot values             |
| Entry removed from sources         | No `entry_frecency` row for E after restore               |
| New entry N in sources             | No `entry_frecency` row for N until visit recorded        |
| Surviving binding B                | `binding_frecency` for B equals snapshot values           |
| Binding removed from sources       | No `binding_frecency` row for B after restore             |
| Import errors non-empty            | `RpcImportResult` returned; learned restore still applied |
| YAML content                       | Projection matches import result (unchanged SY semantics) |

## Non-goals

- Exposing snapshot APIs on RPC.
- Renderer access to snapshot payloads.
- Changing `recordEntryVisit` / `recordBindingVisit` behavior.

## Observability

Log at info:

- `frecency_snapshot_export` with `entry_count`, `binding_count`
- `frecency_snapshot_restore` with `entry_restored`, `entry_skipped`, `binding_restored`, `binding_skipped`

## Test contract

Implementation MUST satisfy assertions in
`src/shell/app/lib/app_sync_frecency.spec.ts` as named in [spec.md](../spec.md) Evidence
columns.
