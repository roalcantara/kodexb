<!-- markdownlint-disable-file -->

# Task source truthfulness — Design

## Overview

Make task mutations **source-first**: YAML write-back must succeed (or surface
failure) before the user-visible operation is considered complete. Refactor
`app_task_source.util.ts` to **throw** or return `Result` types; `App` methods
orchestrate transaction-like steps with explicit rollback where cheap.

## Current behavior (baseline)

| Step | `createTask` / `updateTask`       | `deleteTask`                                         |
| ---- | --------------------------------- | ---------------------------------------------------- |
| 1    | Build `Knowledge`, `upsert(raw)`  | `deleteById`, then `removeTaskFromSource` (swallows) |
| 2    | `writeTaskToSource` (catch → log) | `invalidateListCache`                                |
| 3    | `invalidateListCache`, return     | return                                               |

Evidence: `src/shell/app/app.ts` lines 213–294; `app_task_source.util.ts` lines 6–50.

## Mutation order (normative)

### Create / update

```text
1. Validate input (existing TypeBox + domain)
2. Build Knowledge / merged row in memory (no DB yet) OR staging only
3. writeTaskToSource / atomic YAML update
4. On success: upsert(raw) projection
5. invalidateListCache
6. return Knowledge
7. On YAML failure: throw TaskSourceWriteError (new) — no step 4
```

**Decision:** Prefer **YAML before SQLite** for create/update to avoid orphan
projection rows. Simpler mental model matches foundation doc.

### Delete

```text
1. Load existing; verify task
2. removeTaskFromSource (YAML) — must succeed
3. deleteById (SQLite)
4. invalidateListCache
```

If step 2 fails, SQLite row remains — user still sees task (consistent).

### Reorder

Multi-file writes cannot be one atomic filesystem transaction.

**Decision:** Write all YAML files in defined order; on first failure:

- Stop further writes
- Return `TaskReorderPartialError` with `{ succeededIds, failedPath, cause }`
- Do **not** run `invalidateListCache` until policy documented — prefer
  **re-read projection from YAML via user-triggered sync** only on full success;
  on partial failure, attempt to revert in-memory order in SQLite from last known
  good state OR leave SQLite as-is and return error (document chosen option in
  implementation PR).

**Pragmatic default for v1:** If any YAML write fails, throw; SQLite order may
already be updated — add test proving we **reload order from YAML** on next list
fetch OR rollback SQLite in same method. **Prefer SQLite rollback** using
pre-reorder snapshot in memory for affected ids only.

## Components

| Unit                   | Path                               | Change                                                       |
| ---------------------- | ---------------------------------- | ------------------------------------------------------------ |
| `writeTaskToSource`    | `app_task_source.util.ts`          | Remove outer try/catch swallow; throw `TaskSourceWriteError` |
| `removeTaskFromSource` | same                               | same                                                         |
| `App` task methods     | `app.ts`                           | Reorder steps per table above                                |
| `TaskSourceWriteError` | `task_source_write.error.ts` (new) | Typed error with `path`, `key`, `cause`                      |
| RPC routes             | `task.routes.ts`                   | Map error → 500 or 422 with message (TypeBox error body)     |

## Error surface (RPC)

```ts
// Normative shape (TypeBox in task.routes or shared error schema)
{ error: 'task_source_write_failed', path: string, message: string }
```

Renderer today: surface toast on RPC failure — no renderer spec required if
existing error path shows message.

## Testing strategy

| Layer       | Focus                                                   |
| ----------- | ------------------------------------------------------- |
| Unit        | `app_task_source.util` failure propagation              |
| Integration | `App` with temp dir YAML; chmod read-only file; mock fs |
| Regression  | Happy paths unchanged                                   |

No e2e required for M02 exit.

## Decisions

### Decision: Throw vs Result

**Context:** Shell uses async/await throughout.
**Decision:** Throw `TaskSourceWriteError` from util; `App` does not catch except
to add context.
**Rationale:** Matches existing `throw new Error('Task not found')` patterns in
`App`.

### Decision: No two-phase commit across FS + SQLite

**Context:** True 2PC unavailable.
**Decision:** YAML-first ordering + SQLite rollback on failure for create/update.
**Rationale:** Minimizes “success lie” without large infrastructure.
