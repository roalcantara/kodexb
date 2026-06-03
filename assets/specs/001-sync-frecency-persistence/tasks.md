<!-- markdownlint-disable-file -->

# Sync frecency persistence — Tasks

**Skills:** `app-context`, `app-testing`, `app-quality-gate`

---

## Phase 1 — Snapshot / restore utilities

### Task 1.1 — Define snapshot types

- **Requirements:** SF-1, SF-2
- **Work:** `frecency_snapshot.types.ts` mirroring table columns.
- **Done when:** Types match `schema.ts` columns.
- **Evidence:** `bun test src/shell/app/lib/frecency_snapshot.types.spec.ts`

### Task 1.2 — Implement snapshot before unlink

- **Requirements:** SF-1, SF-2
- **Work:** `snapshotFrecencyState(dbPath)` before unlink in `runSourceImportSync`.
- **Done when:** Unit test proves snapshot non-empty when visits exist.
- **Evidence:** `bun test src/shell/app/lib/frecency_snapshot.util.spec.ts`

### Task 1.3 — Implement restore after import

- **Requirements:** SF-1, SF-2
- **Work:** `restoreFrecencyState` with key-based id remap.
- **Done when:** Integration test SF-1 AC1 passes.
- **Evidence:** `bun test src/shell/app/lib/frecency_restore.util.spec.ts`

---

## Phase 2 — Wire sync pipeline

### Task 2.1 — Integrate into `runSourceImportSync`

- **Requirements:** SF-1, SF-2, SF-3
- **Work:** Update `app_sync.util.ts` sequence.
- **Done when:** `app_sync_frecency.spec.ts` full flow green.
- **Evidence:** `bun test src/shell/app/lib/app_sync_frecency.spec.ts`

### Task 2.2 — Orphan cleanup

- **Requirements:** SF-1 AC2
- **Work:** SQL cleanup after restore.
- **Done when:** SF-1 AC2 test passes.
- **Evidence:** same spec

---

## Phase 3 — Docs and gate

### Task 3.1 — Document persistence classes

- **Requirements:** SF-3
- **Work:** Pointer in foundation design for projection vs learned tables.
- **Done when:** Paragraph merged; README row 1 marked done.
- **Evidence:** PR link

### Task 3.2 — Quality gate

- **Done when:** `mise run spec gate -- assets/specs/001-sync-frecency-persistence` green.
- **Evidence:** gate output
