<!-- markdownlint-disable-file -->

# Handoff — `03_task-source-truthfulness`

**Spec:** `assets/docs/specs/MILESTONE_02/03_task-source-truthfulness/`
**Milestone rank:** 3 · **Points:** 8 · **Target release:** v0.10.0
**Branch suggestion:** `fix/task-source-truthfulness`

---

## Agent prompt (copy-paste to implement)

```text
Implement M02 spec `03_task-source-truthfulness`.

Read IN ORDER:
1. assets/docs/specs/MILESTONE_02/03_task-source-truthfulness/handoff.md
2. requirements.md, design.md, tasks.md in the same folder
3. src/shell/app/lib/app_task_source.util.ts (errors swallowed today)
4. src/shell/app/app.ts createTask/updateTask/deleteTask/reorderTask (~213-294)
5. src/shell/main/rpc/routes/task.routes.ts

GOAL: YAML is source of truth. Task mutations must NOT return RPC success if
YAML write fails. Order: YAML before SQLite for create/update; YAML before
deleteById for delete. reorderTask must not claim full success on partial file failure.

Add TaskSourceWriteError; remove catch-and-log-only in app_task_source.util.ts.

SKILLS: app-context, app-rpc, app-testing, app-quality-gate.
Mirror RPC error shape in tools/preview/server.ts only if RpcApp already includes task routes (same app).

Co-locate all new specs. Run gate before done. Update handoff AC table.
```

---

## Problem (30 seconds)

Today:

1. `createTask` / `updateTask`: **SQLite upsert first**, then `writeTaskToSource`.
2. `writeTaskToSource` / `removeTaskFromSource`: on failure, **log and return** (no throw).
3. RPC returns **success** while YAML may be unchanged → next **sync** can undo the action.

**Evidence:** `app_task_source.util.ts` lines 21–27 (catch logs, no rethrow).

---

## Normative mutation order (must match code after fix)

### Create / update

```text
validate → build Knowledge in memory → writeTaskToSource (YAML) → upsert SQLite → invalidateListCache → return
```

On YAML failure: **throw** before SQLite upsert.

### Delete

```text
load task → removeTaskFromSource (YAML) → deleteById (SQLite) → invalidateListCache
```

On YAML failure: row **remains in SQLite** (user still sees task).

### Reorder

Write YAML for each affected file in order. On any failure: **throw** (or structured partial error per design); **prefer SQLite rollback** from in-memory snapshot of affected task orders taken before writes.

---

## RPC error shape (normative)

```json
{ "error": "task_source_write_failed", "path": "<yaml path>", "message": "<detail>" }
```

HTTP status: non-2xx (422 or 500 — pick one, document in route spec).

Renderer: existing RPC error path should surface message; **no renderer spec required** if toast/error already works.

---

## Implementation order

| Step | Task | Deliverable                                 |
| ---- | ---- | ------------------------------------------- |
| 1    | 1.1  | `task_source_write.error.ts` + spec         |
| 2    | 1.2  | Remove swallow in `app_task_source.util.ts` |
| 3    | 2.1  | YAML-first `createTask` / `updateTask`      |
| 4    | 2.2  | YAML-first `deleteTask`                     |
| 5    | 2.3  | Reorder honesty + rollback test             |
| 6    | 3.1  | `task.routes.ts` error mapping + route spec |
| 7    | 3.2  | Quality gate                                |

---

## Out of scope (do not do)

- Task YAML schema redesign
- Moving task cycles/normalize to `core/` (separate spec rank 7)
- Renderer task sheet UI work
- Background retry queue

---

## Maintainer verification checklist

### TS-1.1 — Source write failure fails RPC (create)

| Field           | Value                                                                                                                                                     |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Requirement** | TS-1 AC1                                                                                                                                                  |
| **Command**     | `bun test src/shell/app/app.task_mutation.spec.ts`                                                                                                        |
| **PASS when**   | Test forces `writeTaskToSource` failure (mock fs or read-only dir): `createTask` **rejects**; **no new row** in SQLite for that key (or row rolled back). |
| **FAIL if**     | `createTask` resolves and returns Knowledge while YAML missing the task.                                                                                  |

### TS-1.2 — Source util propagates (unit)

| Field           | Value                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------- |
| **Requirement** | TS-1 AC1                                                                                          |
| **Command**     | `bun test src/shell/app/lib/app_task_source.util.spec.ts`                                         |
| **PASS when**   | Failure injection causes **rejected promise** / thrown `TaskSourceWriteError`, not resolved void. |
| **FAIL if**     | Catch still swallows.                                                                             |

### TS-1.3 — Happy path unchanged

| Field           | Value                                                                                 |
| --------------- | ------------------------------------------------------------------------------------- |
| **Requirement** | TS-1 AC2                                                                              |
| **Command**     | `bun test src/shell/app/lib/app_task_source.util.spec.ts` and existing app task tests |
| **PASS when**   | All pre-existing happy-path tests green.                                              |
| **FAIL if**     | Regressions on normal create/update/delete.                                           |

### TS-2.1 — Create/update YAML-first

| Field           | Value                                                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Requirement** | TS-2 AC1                                                                                                                 |
| **Command**     | `bun test src/shell/app/app.task_mutation.spec.ts` + read `app.ts`                                                       |
| **PASS when**   | Code order: YAML write before `upsert`; design section linked in PR; failure test shows no orphan SQLite on create fail. |
| **FAIL if**     | Still `upsert` before `writeTaskToSource`.                                                                               |

### TS-2.2 — Delete YAML-first

| Field           | Value                                                    |
| --------------- | -------------------------------------------------------- |
| **Requirement** | TS-2 AC2                                                 |
| **Command**     | `app.task_mutation.spec.ts` delete failure case          |
| **PASS when**   | YAML delete fails → RPC error; **task row still in DB**. |
| **FAIL if**     | SQLite deleted but YAML still contains task.             |

### TS-3.1 — Reorder partial failure honest

| Field           | Value                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------ |
| **Requirement** | TS-3 AC1                                                                                         |
| **Command**     | `bun test src/shell/app/app.task_mutation.spec.ts` reorder case                                  |
| **PASS when**   | Second file write fails → RPC **error** or documented partial type — **not** bare success array. |
| **FAIL if**     | Full success returned when one file failed.                                                      |

### TS-3.2 — Reorder happy path

| Field           | Value                                    |
| --------------- | ---------------------------------------- |
| **Requirement** | TS-3 AC2                                 |
| **Command**     | Existing reorder / task repository tests |
| **PASS when**   | All pass.                                |

### TS-1.4 — Route maps error

| Field           | Value                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------- |
| **Requirement** | TS-1 (RPC surface)                                                                                |
| **Command**     | `bun test src/shell/main/rpc/routes/task.routes.spec.ts`                                          |
| **PASS when**   | Simulated `TaskSourceWriteError` → non-2xx + body contains `task_source_write_failed` and `path`. |
| **FAIL if**     | Error becomes generic 500 with no structure.                                                      |

### Task 1.1 — Error type spec

| Command                                                      | PASS when                                      |
| ------------------------------------------------------------ | ---------------------------------------------- |
| `bun test src/shell/app/lib/task_source_write.error.spec.ts` | Fields `path`, optional `key`, `cause` exposed |

### Milestone gate

| Field         | Value                                                  |
| ------------- | ------------------------------------------------------ |
| **Command**   | `bash .agents/skills/app-quality-gate/scripts/gate.sh` |
| **PASS when** | Exit 0.                                                |
| **Then**      | README backlog row **3** → DONE.                       |

---

## AC summary table (fill on completion)

| AC id  | Requirement              | Met? | Evidence |
| ------ | ------------------------ | ---- | -------- |
| TS-1.1 | Create fails loud        | ☐    |          |
| TS-1.2 | Util throws              | ☐    |          |
| TS-1.3 | Happy path               | ☐    |          |
| TS-2.1 | YAML-first create/update | ☐    |          |
| TS-2.2 | YAML-first delete        | ☐    |          |
| TS-3.1 | Reorder partial honest   | ☐    |          |
| TS-3.2 | Reorder happy            | ☐    |          |
| TS-1.4 | Route error body         | ☐    |          |
| Gate   | Quality gate             | ☐    |          |

---

## Progress tracker

- [x] Specs approved
- [ ] Phase 1 complete
- [ ] Phase 2 complete
- [ ] Phase 3 complete
- [ ] Maintainer signed off AC table

## Completed tasks

| Task | Evidence |
| ---- | -------- |
|      |          |

## Blockers


## Files touched (expected)

- `src/shell/app/lib/app_task_source.util.ts`
- `src/shell/app/lib/app_task_source.util.spec.ts`
- `src/shell/app/lib/task_source_write.error.ts` (new)
- `src/shell/app/lib/task_source_write.error.spec.ts` (new)
- `src/shell/app/app.ts`
- `src/shell/app/app.task_mutation.spec.ts` (new)
- `src/shell/main/rpc/routes/task.routes.ts`
- `src/shell/main/rpc/routes/task.routes.spec.ts`

## Manual smoke (recommended)

**Setup:** Point `writeTarget` / tasks YAML at a temp file you can chmod.

| Step | Action                          | PASS                                             | FAIL                                  |
| ---- | ------------------------------- | ------------------------------------------------ | ------------------------------------- |
| 1    | Create task in UI               | Task appears; YAML file contains task key        | Task only in UI                       |
| 2    | `chmod -w` on YAML; update task | **Error** toast/RPC failure; UI reflects failure | Silent success                        |
| 3    | Fix permissions; create again   | Works                                            | —                                     |
| 4    | Delete task with RO file        | Error; task still listed                         | Task gone from UI but remains in YAML |

---

## Suggested implementation order across M02 🔴 specs

If you are the **maintainer** sequencing work:

1. **02_sync-frecency** — trust killer for anyone who syncs daily
2. **03_task-source** — trust killer for task edits
3. **01_list-tag-facet** — perf; can ship slightly after if needed

Agents may implement in README order (01 → 02 → 03) if you prefer perf first.

---

*Last updated: 2026-06-02*
