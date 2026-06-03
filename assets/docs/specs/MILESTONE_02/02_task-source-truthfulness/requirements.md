<!-- markdownlint-disable-file -->

# Task source truthfulness — Requirements

**Milestone:** M02 · **Consolidated rank:** 1 · **Tracker:** `sync-frecency` unrelated

## Introduction

Users edit tasks through the desktop UI. The product treats **YAML source files**
as the source of truth and SQLite as a **derived projection**
([`foundation/design.md`](../../../MILESTONE_01/foundation/design.md)).

Today, task create/update/delete/reorder in `App` **writes SQLite first**, then
calls `writeTaskToSource` / `removeTaskFromSource`, which **log errors and return
without throwing** (`src/shell/app/lib/app_task_source.util.ts`). The RPC layer
therefore returns **success** while YAML may be unchanged — a silent split-brain
state. A later **sync** can rebuild SQLite from YAML and **undo** the user’s
perceived action.

**Goal:** Task mutation RPC SHALL reflect source persistence outcome. SQLite
updates SHALL NOT be committed in a way that cannot be reconciled with YAML when
source write fails.

## Out of scope

- Redesigning task YAML schema or multi-file task ownership.
- Automatic repair / background retry of failed writes.
- Moving all task policy into `core/` (see rank 7 — separate spec).
- Renderer task-sheet UX changes.

## Glossary

| Term                  | Meaning                                                           |
| --------------------- | ----------------------------------------------------------------- |
| **Source write-back** | Atomic write of task record into user YAML via temp file + rename |
| **Projection**        | SQLite `knowledges` row for the task                              |
| **Mutation**          | `createTask`, `updateTask`, `deleteTask`, `reorderTask`           |

## Requirement syntax

EARS patterns; ids **`TS-N`**. Maps to [design.md](design.md) and [tasks.md](tasks.md).

---

## REQUIREMENT TS-1: Source failure is visible to the caller

**User story:** As a user, when my task cannot be saved to disk, I want the app
to tell me — not pretend it succeeded.

### Acceptance criteria

1. WHEN `writeTaskToSource` or `removeTaskFromSource` fails after all retry-less
   attempts, THEN `App` task mutation methods SHALL propagate failure to the RPC
   route (rejected promise or structured error), not return success.
   - **Measure:** Unit test forces `fs.writeFile` / `fs.rename` failure; `createTask`
     rejects; SQLite row absent or rolled back per design policy.
   - **Evidence:** `bun test src/shell/app/lib/app_task_source.util.spec.ts` (extended)
     and `bun test src/shell/app/app.task_mutation.spec.ts` (new).

2. WHEN source write-back succeeds, THEN the RPC response SHALL return the
   updated `Knowledge` shape as today.
   - **Measure:** Existing happy-path tests continue to pass unchanged.
   - **Evidence:** `bun test` on task source + app specs.

---

## REQUIREMENT TS-2: Consistency policy on create/update/delete

**User story:** As a maintainer, I need one documented order of operations so
tests and support match behavior.

### Acceptance criteria

1. WHEN creating or updating a task, THEN the system SHALL apply the policy
   documented in [design.md § Mutation order](design.md#mutation-order-normative):
   validate → write YAML → update SQLite → invalidate caches → return success.
   - **Measure:** Design section exists; implementation matches sequence in
     code review checklist task 3.2.
   - **Evidence:** `tasks.md` task 3.2 signed off.

2. WHEN deleting a task, THEN the system SHALL remove the task from YAML before
   or together with projection removal such that a failed YAML delete SHALL NOT
   leave only SQLite deleted while YAML still contains the task.
   - **Measure:** Failure injection test: YAML delete fails → RPC error; row still
     present in SQLite OR explicit rollback documented in design.
   - **Evidence:** `app.task_mutation.spec.ts` delete failure case.

---

## REQUIREMENT TS-3: Reorder partial failure is honest

**User story:** As a user reordering tasks across files, I need a clear outcome
when only some files save.

### Acceptance criteria

1. WHEN `reorderTask` updates multiple source files and one write fails, THEN
   the RPC SHALL NOT return full success without indicating partial failure.
   - **Measure:** Test with two tasks in two sources; mock failure on second write;
     response matches design (error or partial result type).
   - **Evidence:** `bun test` reorder partial-failure spec.

2. WHEN all reorder writes succeed, THEN behavior SHALL match current ordering
   semantics.
   - **Measure:** Existing reorder tests pass.
   - **Evidence:** task repository / app specs.

---

## E2e (optional for M02)

Manual dogfood AC is sufficient for M02. If automated later, tag
`@spec:task-source-truthfulness` on a scenario that creates a task and verifies
YAML on disk — not required for milestone exit.
