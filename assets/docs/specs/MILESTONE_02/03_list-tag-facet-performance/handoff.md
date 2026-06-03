<!-- markdownlint-disable-file -->

# Handoff — `01_list-tag-facet-performance`

**Spec:** `assets/docs/specs/MILESTONE_02/01_list-tag-facet-performance/`
**Milestone rank:** 1 (M02 backlog) · **Points:** 5 · **Target release:** v0.10.0
**Branch suggestion:** `fix/list-tag-facet-sql`

---

## Agent prompt (copy-paste to implement)

```text
Implement M02 spec `01_list-tag-facet-performance`.

Read IN ORDER:
1. assets/docs/specs/MILESTONE_02/01_list-tag-facet-performance/handoff.md (this file)
2. requirements.md, design.md, tasks.md in the same folder
3. src/shell/app/lib/list_stats_tag_facets.util.ts (current O(T) loop)
4. src/shell/app/lib/app_list_query.util.ts (shared list filters)

GOAL: `buildTagFacetCounts` must use at most 2 SQL round-trips per call (not N+1),
preserve exact outputs vs current loop (golden test), use `json_each` aggregation,
and pass perf spec (≥10× faster than naive on 50-tag fixture).

SKILLS: app-context, app-testing, app-quality-gate. FCIS: shell/app only.
Do NOT change renderer unless RPC contract changes (it should not).

Follow tasks.md phases 1→3. Co-locate every new `.spec.ts`.
Run: bash .agents/skills/app-quality-gate/scripts/gate.sh before claiming done.
Update handoff.md AC table with Evidence commands and pass/fail.
```

---

## Problem (30 seconds)

`buildTagFacetCounts` calls `countKnowledgeForOpts` **once per tag**. With 50 tags
that is 50+ full list queries per filter keystroke — bad for a keyboard app.

**Baseline file:** `src/shell/app/lib/list_stats_tag_facets.util.ts`

---

## Implementation order

| Step | Task                      | File(s)                              |
| ---- | ------------------------- | ------------------------------------ |
| 1    | 1.1 Shared WHERE fragment | `app_list_query.util.ts` (+ spec)    |
| 2    | 2.1 SQL aggregation path  | `list_stats_tag_facets.util.ts`      |
| 3    | 2.2 Golden parity         | `list_stats_tag_facets.util.spec.ts` |
| 4    | 2.3 Perf ratio            | `list_stats_tag_facets.perf.spec.ts` |
| 5    | 3.1 Gate                  | —                                    |

**Design default for marginal tags:** One `json_each` grouped query for unselected
tags; for tags already in `selectedTags`, still call `countKnowledgeForOpts` (small set).

---

## Out of scope (do not do)

- Renderer / compact filter UI changes
- Debounce changes
- FTS or main list query optimization
- Caching layer across keystrokes

---

## Maintainer verification checklist

Mark each row **PASS** only after you run the command and confirm the expected outcome.

### TF-1.1 — Query count ≤ 2 (not N+1)

| Field           | Value                                                                                                                                                          |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Requirement** | TF-1 AC1                                                                                                                                                       |
| **Command**     | `bun test src/shell/app/lib/list_stats_tag_facets.util.spec.ts`                                                                                                |
| **PASS when**   | Spec includes a case with ~10 distinct tags; assertion shows **≤ 2** SQL executions per `buildTagFacetCounts` call (spy on `raw.query` or repository counter). |
| **FAIL if**     | Loop still calls `countKnowledgeForOpts` per tag without bounded queries.                                                                                      |

### TF-1.2 — Golden parity vs legacy loop

| Field           | Value                                                                                                                                                                                        |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Requirement** | TF-1 AC2                                                                                                                                                                                     |
| **Command**     | Same spec file — `golden parity` or equivalent describe block                                                                                                                                |
| **PASS when**   | For minimal fixture DB + fixed opts (`query`, `types`, `taskView`, `selectedTags`), new util output **deep-equals** naive loop (naive may live only in spec as `buildTagFacetCounts_naive`). |
| **FAIL if**     | Any tag count differs on `src/__tests__/fixtures/minimal/` import path used by test.                                                                                                         |

### TF-2.1 — Performance

| Field           | Value                                                                                                                                           |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Requirement** | TF-2 AC1                                                                                                                                        |
| **Command**     | `bun test src/shell/app/lib/list_stats_tag_facets.perf.spec.ts`                                                                                 |
| **PASS when**   | Median of 5 runs: **optimized ≥ 10× faster** than naive loop on 50-tag seeded DB **OR** optimized median **&lt; 50 ms** (spec documents which). |
| **FAIL if**     | Ratio &lt; 10 and median ≥ 50 ms.                                                                                                               |

### TF-3.1 — `json_each` in SQL path

| Field           | Value                                                                                                                                     |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Requirement** | TF-3 AC1                                                                                                                                  |
| **Command**     | `bun test src/shell/app/lib/list_stats_tag_facets.util.spec.ts` (snapshot) **and** read implementation                                    |
| **PASS when**   | Production SQL path contains `json_each` on `knowledges.tags` (or prepared stmt registered in repository with same SQL in snapshot test). |
| **FAIL if**     | Only per-tag loops, no set-based aggregation.                                                                                             |

### Task 1.1 — List filter tests still green

| Field           | Value                                                    |
| --------------- | -------------------------------------------------------- |
| **Requirement** | TF-3 (shared predicate)                                  |
| **Command**     | `bun test src/shell/app/lib/app_list_query.util.spec.ts` |
| **PASS when**   | All tests pass; no behavior change to list/count APIs.   |

### Milestone gate

| Field         | Value                                                              |
| ------------- | ------------------------------------------------------------------ |
| **Command**   | `bash .agents/skills/app-quality-gate/scripts/gate.sh`             |
| **PASS when** | Exit code 0 on your branch.                                        |
| **Then**      | Set M02 README backlog row **1** → DONE; paste gate summary below. |

---

## AC summary table (fill on completion)

| AC id  | Requirement   | Met? | Evidence (command + one line result) |
| ------ | ------------- | ---- | ------------------------------------ |
| TF-1.1 | ≤2 SQL calls  | ☐    |                                      |
| TF-1.2 | Golden parity | ☐    |                                      |
| TF-2.1 | Perf ratio    | ☐    |                                      |
| TF-3.1 | json_each     | ☐    |                                      |
| Gate   | Quality gate  | ☐    |                                      |

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

- `src/shell/app/lib/list_stats_tag_facets.util.ts`
- `src/shell/app/lib/list_stats_tag_facets.util.spec.ts` (new/extended)
- `src/shell/app/lib/list_stats_tag_facets.perf.spec.ts` (new)
- `src/shell/app/lib/app_list_query.util.ts` (possible)
- `src/shell/app/db/entry.repository.ts` (possible if SQL lives here)

## Manual smoke (optional)

1. `mise run app start` (or project dev command).
2. Open list → compact filter → type in search with a corpus that has many tags.
3. Tag counts should update without noticeable stall (subjective; ACs are automated).

---

*Last updated: 2026-06-02*
