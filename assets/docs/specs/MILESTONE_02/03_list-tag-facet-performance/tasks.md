<!-- markdownlint-disable-file -->

# List tag facet performance — Tasks

**Skills:** `app-context`, `app-testing`, `app-quality-gate`

---

## Phase 1 — Shared predicate

### Task 1.1 — Extract list filter SQL fragment

- **Requirements:** TF-3
- **Work:** Function `listFilterWhereClause(opts)` used by list query and facets.
- **Done when:** Existing list/count tests pass unchanged.
- **Evidence:** `bun test src/shell/app/lib/app_list_query.util.spec.ts`

---

## Phase 2 — Aggregated facets

### Task 2.1 — Implement `buildTagFacetCounts` SQL path

- **Requirements:** TF-1, TF-3
- **Work:** `json_each` aggregate per design; keep selected-tag marginal path.
- **Done when:** TF-1 query count test passes.
- **Evidence:** `bun test src/shell/app/lib/list_stats_tag_facets.util.spec.ts`

### Task 2.2 — Golden parity vs naive

- **Requirements:** TF-1 AC2
- **Work:** Naive reference in spec; compare on minimal fixture.
- **Done when:** Deep equality on tag map.
- **Evidence:** same spec

### Task 2.3 — Performance ratio test

- **Requirements:** TF-2
- **Work:** `list_stats_tag_facets.perf.spec.ts` with 50-tag seed.
- **Done when:** TF-2 measure satisfied.
- **Evidence:** `bun test src/shell/app/lib/list_stats_tag_facets.perf.spec.ts`

---

## Phase 3 — Gate

### Task 3.1 — Quality gate + tracker

- **Done when:** `gate.sh` green; rank 3 → `done` in backlog tracker.
- **Evidence:** gate output
