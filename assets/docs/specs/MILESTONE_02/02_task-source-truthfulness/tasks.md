<!-- markdownlint-disable-file -->

# Task source truthfulness — Tasks

**Skills:** `app-context`, `app-rpc`, `app-testing`, `app-quality-gate`

---

## Phase 1 — Error type and util

### Task 1.1 — Add `TaskSourceWriteError`

- **Requirements:** TS-1
- **Work:** New `src/shell/app/lib/task_source_write.error.ts` + spec.
- **Done when:** Error carries `path`, `key?`, `cause`; serializable message.
- **Evidence:** `bun test src/shell/app/lib/task_source_write.error.spec.ts`

### Task 1.2 — Propagate failures from source util

- **Requirements:** TS-1
- **Work:** Remove swallowing catch in `writeTaskToSource` / `removeTaskFromSource`;
  rethrow wrapped error. Update existing util specs for failure paths.
- **Done when:** Forced I/O failure causes rejection, not resolved void.
- **Evidence:** `bun test src/shell/app/lib/app_task_source.util.spec.ts`

---

## Phase 2 — App orchestration

### Task 2.1 — Reorder create/update to YAML-first

- **Requirements:** TS-2
- **Work:** Refactor `createTask`, `updateTask` in `app.ts` per
  [design.md § Create / update](design.md#mutation-order-normative).
- **Done when:** Failure injection leaves no new SQLite row on create failure.
- **Evidence:** `bun test src/shell/app/app.task_mutation.spec.ts` (new)

### Task 2.2 — Reorder delete to YAML-first

- **Requirements:** TS-2
- **Work:** `deleteTask` calls `removeTaskFromSource` before `deleteById`.
- **Done when:** YAML failure leaves row in SQLite.
- **Evidence:** same spec file, delete case

### Task 2.3 — Reorder partial failure policy

- **Requirements:** TS-3
- **Work:** Implement reorder rollback or documented error per design; add test.
- **Done when:** TS-3 AC 1–2 evidenced in spec output.
- **Evidence:** `bun test src/shell/app/app.task_mutation.spec.ts`

---

## Phase 3 — RPC and gate

### Task 3.1 — Map error in task routes

- **Requirements:** TS-1
- **Work:** `task.routes.ts` catches `TaskSourceWriteError`, returns structured
  JSON + non-2xx. Mirror in `tools/preview/server.ts` if needed (same RpcApp).
- **Done when:** Route spec asserts status and body on thrown error.
- **Evidence:** `bun test src/shell/main/rpc/routes/task.routes.spec.ts`

### Task 3.2 — Quality gate

- **Requirements:** TS-1, TS-2, TS-3
- **Work:** Run full gate; update tracker row rank 1 → `done`.
- **Done when:** `bash .agents/skills/app-quality-gate/scripts/gate.sh` exits 0.
- **Evidence:** paste gate summary in PR or handoff
