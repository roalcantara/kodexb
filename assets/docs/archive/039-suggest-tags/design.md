<!-- markdownlint-disable-file -->
# suggestTags — Design

## OVERVIEW

Implement `App.suggestTags(entryId)` using statistical co-occurrence + keyword extraction. No external AI providers. No new dependencies. Pure TypeScript in the App layer.

The RPC route, schema, and client wrapper already exist — only `App.suggestTags()` needs a real implementation.

---

## ALGORITHM

1. **Co-occurrence** (primary): For each tag already on the entry, find which other tags most frequently appear alongside it across all entries in the knowledge base. Score by co-occurrence count.
2. **Keyword extraction** (fallback): Extract meaningful words from `entry.key` + `entry.desc`. Filter stop words. Match against all existing tag names in the DB. Score: exact match > prefix match > substring.
3. **Combine**: Co-occurrence results first, then keyword matches. Deduplicate. Exclude tags already on the entry. Return top 8.

---

## FILES

| File | Action |
|------|--------|
| `src/shell/app/app.ts` | Replace `suggestTags` stub |
| `src/shell/app/app.spec.ts` | Add tests |
