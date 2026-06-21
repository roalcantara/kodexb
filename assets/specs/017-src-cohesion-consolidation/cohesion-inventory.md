# Cohesion Inventory — `src/` merge-bar verdicts

Feature: `017-src-cohesion-consolidation`
Date: 2026-06-20

## Inventory by directory

### `src/core/domain/models/knowledges/detail/`

| File | Bar | Verdict | Importer evidence |
|---|---|---|---|
| `doc.bookmark.parser.ts` | **(A) dispatch family** | merge → `doc.parser.ts` | Only imported by `doc.assembler.ts:4` |
| `doc.cheat.parser.ts` | **(A) dispatch family** | merge → `doc.parser.ts` | Only imported by `doc.assembler.ts:5` |
| `doc.command.parser.ts` | **(A) dispatch family** | merge → `doc.parser.ts` | Only imported by `doc.assembler.ts:6` |
| `doc.shortcut.parser.ts` | **(A) dispatch family** | merge → `doc.parser.ts` | Only imported by `doc.assembler.ts:7` |
| `doc.task.parser.ts` | **(A) dispatch family** | merge → `doc.parser.ts` | Only imported by `doc.assembler.ts:8` |
| `doc.assembler.ts` | **(A) orchestrator** | keep — refactor `buildPreamble` out | — |

**Evidence:** `rg -rn 'buildBookmarkPreamble|buildCheatPreamble|buildCommandPreamble|buildShortcutPreamble|buildTaskPreamble' src --glob '!*.spec.*'` → all symbols referenced only from `doc.assembler.ts` (imports + dispatch).

---

### `src/core/domain/models/knowledges/tags/`

| File | Bar | Verdict | Importer evidence |
|---|---|---|---|
| `extract_keywords.util.ts` | **(B) encapsulation** | inline → `rank_suggested_tags.util.ts` | Only imported by `rank_suggested_tags.util.ts:3` |
| `cooccurrence.util.ts` | **(B) encapsulation** | inline → `rank_suggested_tags.util.ts` | Only imported by `rank_suggested_tags.util.ts:2` |
| `rank_suggested_tags.util.ts` | **(B) orchestrator** | keep — absorb both helpers | — |
| `sorted_tags.util.ts` | **keep** | external importers exist | `filter_dropdown.component.tsx:2`, `use_compact_filter_overlay.hook.ts:1`, `use_compact_filter_overlay_rows.hook.ts:1` |
| `stop_words.const.ts` | **keep** | data constant | — |
| `suggest_max_results.const.ts` | **keep** | data constant | — |

**Evidence:**
- `rg -rn '\bextractKeywords\b' src --glob '!*.spec.*'` → only `rank_suggested_tags.util.ts:10`
- `rg -rn '\bcomputeCooccurrence\b|\bcountCooccurrence\b' src --glob '!*.spec.*'` → only `rank_suggested_tags.util.ts:2,8,26`
- `rg -rn '\bsortedTags\b' src --glob '!*.spec.*'` → `filter_dropdown.component.tsx:69`, `use_compact_filter_overlay.hook.ts:58`, `use_compact_filter_overlay_rows.hook.ts:47`

---

### `src/core/domain/models/knowledges/task_views/`

| File | Bar | Verdict | Importer evidence |
|---|---|---|---|
| `is_actionable.util.ts` | **(B) encapsulation** | inline → `filter_by_view.util.ts` | Only imported by `filter_by_view.util.ts:3` |
| `is_overdue.util.ts` | **(B) encapsulation** | inline → `filter_by_view.util.ts` | Only imported by `filter_by_view.util.ts:4` |
| `filter_by_view.util.ts` | **(B) orchestrator** | keep — absorb both predicates | — |
| `show_task_section.util.ts` | **keep** | external importers exist | `filter_dropdown.component.tsx:3`, `compact_filter_overlay_build_rows.util.ts:2` |
| `task_date.util.ts` | **keep** | distinct concern (date utilities) | — |
| `count_by_view.util.ts` | **keep** | distinct concern (aggregation) | — |
| `task_view_order.const.ts` | **keep** | data constant | — |

**Evidence:**
- `rg -rn '\bisActionablePlaceholder\b' src --glob '!*.spec.*'` → only `filter_by_view.util.ts:3,30`
- `rg -rn '\bisOverdue\b' src --glob '!*.spec.*'` → `filter_by_view.util.ts:4,31,32` + `doc.task.parser.ts:32,33` (inline usage, not import)
- `rg -rn '\bshowTaskSection\b' src --glob '!*.spec.*'` → `filter_dropdown.component.tsx:104`, `compact_filter_overlay_build_rows.util.ts:37`

---

### `src/core/helpers/list_opts/`

| File | Bar | Verdict | Importer evidence |
|---|---|---|---|
| `default_page_size.const.ts` | **keep** | distinct concern (constant) | — |
| `find_all_opts.types.ts` | **keep** | separate type definition | — |
| `index.ts` | **keep** | barrel — no merge candidate | — |
| `stable_cache_key.util.ts` | **keep** | unrelated transform (fails A and B) | — |
| `to_find_all_opts.util.ts` | **keep** | unrelated transform (fails A and B) | — |

**Evidence:** No dispatch family (A) signature — each file is a distinct, non-overlapping concern. No single orchestrator privately consuming others (B).

---

### `src/shared/constants/`

| File | Bar | Verdict | Importer evidence |
|---|---|---|---|
| `binding_frecency_weight.const.ts` | **keep** | unrelated domain | — |
| `entry_type.const.ts` | **keep** | unrelated domain | — |
| `quick_lookup_row_limit.const.ts` | **keep** | unrelated domain | — |

**Evidence:** No relationships between files. Each is a standalone constant module in unrelated domains.
