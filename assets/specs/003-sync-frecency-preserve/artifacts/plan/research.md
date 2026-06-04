# Research: Sync frecency preserve

**Feature**: `003-sync-frecency-preserve` | **Date**: 2026-06-03

## R1: How sync destroys learned state today

**Decision**: Snapshot must occur **before** `closeDb()` and filesystem `unlink` in
`runSourceImportSync`.

**Rationale**: `ImportService` opens a fresh DB after delete; `entry_frecency` has
`REFERENCES knowledges(id) ON DELETE CASCADE`, so any rebuild without restore loses visits.

**Alternatives considered**:

| Alternative                                     | Rejected because                                                        |
| ----------------------------------------------- | ----------------------------------------------------------------------- |
| Skip DB delete, truncate projection tables only | Higher risk to FTS/bindings consistency; spec assumes full rebuild path |
| Persist learned state in YAML                   | Out of scope; violates “local-only learned” product model               |
| Separate learned-state DB file                  | Out of scope for this increment                                         |

## R2: Join keys for restore

**Decision**: Restore entry rows only when `entry_id` exists in `knowledges`; restore
binding rows only when `binding_id` exists in `entry_bindings`.

**Rationale**: Matches Clarify “gone is gone” without explicit orphan-delete ACs. CASCADE
already removes frecency when knowledge deleted during import.

**Alternatives considered**:

| Alternative                       | Rejected because                                                |
| --------------------------------- | --------------------------------------------------------------- |
| Restore all snapshot rows blindly | Would recreate frecency for removed entries (violates SF-1 AC2) |
| Map by `entry.key` string         | Id is stable import key per spec assumptions                    |

## R3: Partial sync failure + usage restore

**Decision**: Always restore from pre-sync snapshot in a `finally` block after import
attempt, regardless of `RpcImportResult.errors`.

**Rationale**: Aligns with Clarify Option D and constitution Principle III. Import
already commits per-file bundles; “failure” can mean errors array non-empty or thrown
exception.

**Alternatives considered**:

| Alternative                          | Rejected because                  |
| ------------------------------------ | --------------------------------- |
| Roll back entire import on any error | Changes SY-* semantics (SF-3 AC1) |
| Discard usage on failure             | Violates clarified spec SF-3 AC4  |

## R4: Performance of snapshot

**Decision**: Single `SELECT *` per learned table into typed arrays; restore via batched
upsert in one transaction.

**Rationale**: Typical visit history ≪ catalog size; avoids second on-disk DB. Meets
Principle I (no perceptible stall beyond import).

**Alternatives considered**:

| Alternative                    | Rejected because                         |
| ------------------------------ | ---------------------------------------- |
| Copy SQLite file before delete | Doubles disk I/O; WAL cleanup complexity |
| ATTACH snapshot DB             | Over-engineered for two small tables     |

## R5: Test placement and patterns

**Decision**: Primary gate: `src/shell/app/lib/app_sync_frecency.spec.ts` using real
`App` + `:memory:` DB + minimal YAML under `src/__tests__/fixtures/sample/` (extend only
if needed).

**Rationale**: Matches spec Evidence paths and TESTING_GUIDE (no AppService mocks,
`:memory:` only).

**Alternatives considered**:

| Alternative          | Rejected because                                  |
| -------------------- | ------------------------------------------------- |
| Renderer e2e only    | Stretch; slower; spec declares integration gate   |
| Mock `ImportService` | Violates no-mock policy for behavioral guarantees |

## R6: RPC / preview server

**Decision**: No new Elysia routes; `App.sync()` contract unchanged.

**Rationale**: Feature is internal to import pipeline; renderer already calls existing sync
RPC.

**Alternatives considered**: N/A — constitution IV requires mirror only on new routes.
