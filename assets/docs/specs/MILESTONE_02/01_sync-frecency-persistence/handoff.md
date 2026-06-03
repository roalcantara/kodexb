<!-- markdownlint-disable-file -->

# Handoff — `01_sync-frecency-persistence`

**Spec:** `assets/docs/specs/MILESTONE_02/01_sync-frecency-persistence/`
**Milestone rank:** 2 · **Points:** 8 · **Target release:** v0.10.0
**Branch suggestion:** `fix/sync-frecency-persistence`

---

## Agent prompt (copy-paste to implement)

```text
Implement M02 spec `01_sync-frecency-persistence`.

Read IN ORDER:
1. assets/docs/specs/MILESTONE_02/01_sync-frecency-persistence/handoff.md
2. requirements.md, design.md, tasks.md in the same folder
3. src/shell/app/lib/app_sync.util.ts (unlink DB today — wipes frecency)
4. src/shell/app/db/schema.ts (entry_frecency, binding_frecency tables)
5. M01 sync spec context: assets/docs/specs/MILESTONE_01/sync/requirements.md (SY-* still applies)

GOAL: Full sync rebuilds YAML projection but PRESERVES learned local state:
- entry_frecency (entry_id, visit_count, last_visited_at, frecency_score)
- binding_frecency (binding_id, score, last_event_at)

Flow: snapshot BEFORE unlink → import → restore with id remap by stable keys.

SKILLS: app-context, app-testing, app-quality-gate. Do NOT implement separate DB file (option 2) unless design decision recorded in handoff.

Co-locate specs. Integration test app_sync_frecency.spec.ts is the milestone proof.
Run gate before done. Update this handoff AC table.
```

---

## Problem (30 seconds)

`runSourceImportSync` deletes the SQLite file then reimports from YAML.
**Frecency tables are not in YAML** — they are learned from usage. Every sync
currently **resets ranking personalization**.

**Baseline:** `src/shell/app/lib/app_sync.util.ts` lines 21–38 (`unlink` db/wal/shm).

---

## Schema reference (implement from code)

**`entry_frecency`** (`schema.ts`):

- `entry_id` → `knowledges(id)` ON DELETE CASCADE
- `visit_count`, `last_visited_at`, `frecency_score`

**`binding_frecency`:**

- `binding_id` TEXT PRIMARY KEY (stable across import)
- `score`, `last_event_at`

**Remap rule:** After import, `knowledges.id` may change — snapshot must
include **`knowledges.key`** (or equivalent) to remap `entry_id`. Bindings use
`binding_id` string id.

---

## Implementation order

| Step | Task | Deliverable                                      |
| ---- | ---- | ------------------------------------------------ |
| 1    | 1.1  | `frecency_snapshot.types.ts` + minimal spec      |
| 2    | 1.2  | `frecency_snapshot.util.ts` — read before unlink |
| 3    | 1.3  | `frecency_restore.util.ts` — write after import  |
| 4    | 2.1  | Wire `runSourceImportSync`                       |
| 5    | 2.2  | Orphan cleanup SQL                               |
| 6    | 3.1  | Short doc note (foundation or M02 closeout)      |
| 7    | 3.2  | Quality gate                                     |

**`:memory:` tests:** Ensure snapshot/restore no-op or skip safely when
`dbPath === ':memory:'` if existing tests use in-memory DB.

---

## Out of scope (do not do)

- Frecency algorithm / score formula changes (`core/`)
- Incremental sync
- Second SQLite file for learned state (defer to rank 22)
- Changing sync progress UX

---

## Maintainer verification checklist

### SF-1.1 — Entry frecency survives sync

| Field           | Value                                                                                                                                                                                                                                                                |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Requirement** | SF-1 AC1                                                                                                                                                                                                                                                             |
| **Command**     | `bun test src/shell/app/lib/app_sync_frecency.spec.ts`                                                                                                                                                                                                               |
| **PASS when**   | Test flow: (1) seed DB + YAML fixture, (2) record visits / set frecency rows, (3) capture sort order or `frecency_score` for a stable entry key, (4) run full sync, (5) assert same entry key still has **same or restored** frecency influence on list order/score. |
| **FAIL if**     | After sync, visited entry sorts as if never visited (scores zeroed).                                                                                                                                                                                                 |

### SF-1.2 — Orphan frecency removed when entry gone from YAML

| Field           | Value                                                                                                    |
| --------------- | -------------------------------------------------------------------------------------------------------- |
| **Requirement** | SF-1 AC2                                                                                                 |
| **Command**     | Same spec — orphan case                                                                                  |
| **PASS when**   | Visit entry A → remove A from YAML sources → sync → **no** `entry_frecency` row for A's new id (or key). |
| **FAIL if**     | Orphan row remains forever.                                                                              |

### SF-2.1 — Binding frecency survives sync

| Field           | Value                                                                                                                                   |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Requirement** | SF-2 AC1                                                                                                                                |
| **Command**     | `bun test src/shell/app/lib/app_sync_frecency.spec.ts` (binding describe)                                                               |
| **PASS when**   | Binding visit/frecency row exists before sync and **same binding_id** row exists after sync with preserved score (or restorable score). |
| **FAIL if**     | `binding_frecency` empty after sync.                                                                                                    |

### SF-3.1 — Sync still completes (no regression)

| Field           | Value                                                                                                                  |
| --------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Requirement** | SF-3 AC1                                                                                                               |
| **Command**     | `bun test src/shell/app/lib/app_sync.util.spec.ts` and `bun test src/shell/app/db/import.service.spec.ts` (if present) |
| **PASS when**   | Existing sync/import tests pass; no hang; `RpcImportResult` shape unchanged.                                           |
| **FAIL if**     | Sync throws before `syncComplete` or import tests fail.                                                                |

### Unit specs (implementation quality)

| Command                                                     | PASS when                                 |
| ----------------------------------------------------------- | ----------------------------------------- |
| `bun test src/shell/app/lib/frecency_snapshot.util.spec.ts` | Snapshot non-empty when DB has visit data |
| `bun test src/shell/app/lib/frecency_restore.util.spec.ts`  | Restore writes expected row counts        |

### Milestone gate

| Field         | Value                                                  |
| ------------- | ------------------------------------------------------ |
| **Command**   | `bash .agents/skills/app-quality-gate/scripts/gate.sh` |
| **PASS when** | Exit 0.                                                |
| **Then**      | README backlog row **2** → DONE.                       |

---

## AC summary table (fill on completion)

| AC id  | Requirement               | Met? | Evidence |
| ------ | ------------------------- | ---- | -------- |
| SF-1.1 | Entry frecency survives   | ☐    |          |
| SF-1.2 | Orphan cleanup            | ☐    |          |
| SF-2.1 | Binding frecency survives | ☐    |          |
| SF-3.1 | Sync regression           | ☐    |          |
| Gate   | Quality gate              | ☐    |          |

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

- `src/shell/app/lib/app_sync.util.ts`
- `src/shell/app/lib/frecency_snapshot.util.ts` (new)
- `src/shell/app/lib/frecency_restore.util.ts` (new)
- `src/shell/app/lib/frecency_snapshot.types.ts` (new)
- `src/shell/app/lib/app_sync_frecency.spec.ts` (new)
- `src/shell/app/lib/frecency_snapshot.util.spec.ts` (new)
- `src/shell/app/lib/frecency_restore.util.spec.ts` (new)
- Short addition to `assets/docs/specs/MILESTONE_01/foundation/design.md` OR `MILESTONE_02/README.md` (task 3.1)

## Manual smoke (recommended for this spec)

1. Open app, use list so several entries gain frecency (open details / actions).
2. Note which entry ranks top for your corpus.
3. Trigger **Sync** from UI.
4. **PASS:** Top entries still feel “warm” (same rough order as before sync).
5. **FAIL:** Everything feels reset to alphabetical / import order only.

---

*Last updated: 2026-06-02*
