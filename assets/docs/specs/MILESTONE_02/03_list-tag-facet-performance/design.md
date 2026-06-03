<!-- markdownlint-disable-file -->

# List tag facet performance — Design

## Overview

Replace the per-tag loop in `buildTagFacetCounts` with:

1. One query: distinct tags in corpus (existing `getTagCounts` may remain for
   universe — or fold into aggregate).
2. One query: for current `ListOpts` filter (query, types, taskView, selectedTags),
   compute counts per tag using `json_each` + `GROUP BY`.

## Current algorithm

```ts
const tagKeys = Object.keys(getTagCounts(raw))  // query A
for (const tag of tagKeys) {
  tagsOut[tag] = countKnowledgeForOpts(raw, loaded, { ...opts, tags: marginal })  // query B×T
}
```

## Target SQL (normative shape)

Filter knowledges to the same subset as `countKnowledgeForOpts` / list query
(shared WHERE builder — **extract or reuse** predicate builder from
`app_list_query.util.ts` to avoid drift).

```sql
SELECT je.value AS tag, COUNT(DISTINCT k.id) AS cnt
FROM knowledges k
JOIN json_each(k.tags) AS je
WHERE <shared-list-predicate>
GROUP BY je.value
```

For **marginal** semantics when tag already selected: count without adding tag
to filter (current loop behavior) — implement as:

- If tag ∈ selectedSet: run predicate with `selectedTags` only.
- Else: run predicate with `selectedTags ∪ { tag }`.

**Decision:** Two-pass in **one SQL** using conditional aggregation OR run one
grouped query per “selection expansion” — prefer **single grouped query** with
max tags from universe and post-process marginal logic in TS only when
|selected| small; if complex, **one grouped query for unselected tags** +
reuse `countKnowledgeForOpts` only for selected (typically few).

**Pragmatic v1:** One `json_each` grouped query for all tags under base opts
without marginal expansion; for tags in `selectedSet`, set
`tagsOut[tag] = countKnowledgeForOpts(..., selectedTags)` — selected set size
≪ T, acceptable.

## Components

| Unit                                              | Change                                   |
| ------------------------------------------------- | ---------------------------------------- |
| `list_stats_tag_facets.util.ts`                   | New SQL path + fallback guard            |
| `entry.repository.ts` or `app_list_query.util.ts` | Shared WHERE fragment                    |
| `app_list_stats*.util.ts`                         | Callers unchanged if util signature same |

## Correctness parity

Golden test: copy loop implementation to
`buildTagFacetCounts_naive` in spec file only; compare outputs on
`src/__tests__/fixtures/minimal/` DB.

## Performance test

Seed in-memory DB with 50 tags × 20 entries; compare naive vs optimized median.

## Out of scope

- FTS query path optimization (separate).
