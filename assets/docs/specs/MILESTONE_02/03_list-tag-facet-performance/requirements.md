<!-- markdownlint-disable-file -->

# List tag facet performance — Requirements

**Milestone:** M02 · **Consolidated rank:** 3

## Introduction

The compact filter UI shows **per-tag counts** for the current list query
(filters + search + task view). `buildTagFacetCounts`
(`src/shell/app/lib/list_stats_tag_facets.util.ts`) loads all tag keys, then for
**each tag** calls `countKnowledgeForOpts`, which runs a full
`findAll`-style query.

With **T tags**, one stats refresh performs **O(T) database round-trips** —
unacceptable for a keyboard-driven app when T is tens or hundreds.

**Goal:** Tag facet counts for the current filter context SHALL be computed in
**one SQL query** (or fixed small number), not one query per tag.

## Out of scope

- Redesigning filter UX or tag index UI.
- Caching strategy across keystrokes (debounce stays in renderer).
- Changing frecency sort or main list query plans.

## Glossary

| Term             | Meaning                                                                    |
| ---------------- | -------------------------------------------------------------------------- |
| **Tag facet**    | Count of entries matching current opts **plus** hypothetical tag selection |
| **Marginal tag** | Tag already in `selectedTags` — count uses current selection only          |

---

## REQUIREMENT TF-1: Single-query facet counts

**User story:** As a user typing in the list search or toggling filters, I want
tag counts to update without perceptible lag.

### Acceptance criteria

1. WHEN `buildTagFacetCounts` runs for a corpus with **N** distinct tags, THEN
   the shell app SHALL execute at most **2** SQL statements (1 for tag universe,
   1 for aggregated counts) per invocation — not **N+1**.
   - **Measure:** Test spy / query counter wrapper on `DbRaw` in spec; assert
     call count ≤ 2 for N=10 fixture.
   - **Evidence:** `bun test src/shell/app/lib/list_stats_tag_facets.util.spec.ts`

2. WHEN filters match the release e2e minimal corpus, THEN `buildTagFacetCounts`
   output SHALL match the **legacy implementation** on the same inputs (golden
   object comparison).
   - **Measure:** Parallel run old vs new in test (extract old to test helper) OR
     frozen expected JSON fixture.
   - **Evidence:** same spec file `golden parity` case

---

## REQUIREMENT TF-2: Large-tag corpus bounded time

**User story:** As a user with many tags, facet refresh must stay interactive.

### Acceptance criteria

1. WHEN the fixture DB contains **≥ 50** distinct tags and a typical filter set,
   THEN `buildTagFacetCounts` SHALL complete in **&lt; 50 ms** on CI runner
   (local gate; not flaky wall clock in parallel CI — use relative: new ≤ 10×
   faster than old loop).
   - **Measure:** Benchmark-style test comparing durations old vs new; assert
     ratio ≥ 10 OR absolute &lt; 50ms with `performance.now()` median of 5 runs.
   - **Evidence:** `list_stats_tag_facets.perf.spec.ts` (new, marked non-flaky)

---

## REQUIREMENT TF-3: SQL uses json_each

**User story:** As a maintainer, the optimization should use SQLite JSON support
already used elsewhere in entries.

### Acceptance criteria

1. WHEN reviewing the implementation, THEN tag aggregation SHALL use
   `json_each` (or equivalent single-pass strategy) on the `tags` column documented
   in design.
   - **Measure:** Code review + test asserts SQL string contains `json_each` OR
     prepared statement name registered in repository layer.
   - **Evidence:** `entry.repository` or `list_stats_tag_facets` spec snapshot
