# Thin-file inventory (SRC-5 AC1)

Files ≤15 LOC (non-spec) under `src/`, bucketed per SRC-5 rules.

## Mergeable
Files in the same directory whose ls-lint suffix rule permits combining.

| Source | LOC | Target | Notes |
|--------|-----|--------|-------|
| `src/core/domain/models/knowledges/preview/youtube_id.regex.const.ts` | 1 | → `og_image.regex.const.ts` (same dir, both `*.regex.const.ts`) | Single regex const each; ls-lint permits merging sibling consts |
| `src/core/domain/models/sources/index.ts` | 1 | — barrel | already a barrel, leave as-is |

## Lint-locked
Files whose directory's ls-lint rule requires one artifact per basename suffix.

| File | LOC |
|------|-----|
| `src/core/domain/models/entries/parsers/meta.parser.ts` | 1 |
| `src/core/domain/models/entries/schemas/notes.schema.ts` | 1 |
| `src/core/domain/models/knowledges/tags/suggest_max_results.const.ts` | 1 |
| `src/shared/types/env.types.ts` | 1 |
| `src/shell/app/lib/app_entry_preview.util.ts` | 1 |
| `src/shell/main/index.ts` | 1 |
| `src/core/domain/constants/index.ts` | 2 |
| `src/core/helpers/list_opts/default_page_size.const.ts` | 2 |
| `src/shared/constants/quick_lookup_row_limit.const.ts` | 2 |
| `src/shared/logging/logger.ts` | 2 |
| `src/shared/typebox/index.ts` | 2 |
| `src/shared/types/index.ts` | 2 |
| `src/shared/utils/index.ts` | 2 |
| `src/shell/renderer/index.ts` | 2 |
| `src/core/constants/index.ts` | 3 |
| `src/core/domain/models/index.ts` | 3 |
| `src/core/domain/models/knowledges/preview/index.ts` | 3 |
| `src/core/domain/models/knowledges/task_views/task_view_order.const.ts` | 3 |
| `src/core/index.ts` | 3 |
| `src/shared/utils/fire_and_forget.ts` | 3 |
| `src/core/constants/lang.const.ts` | 4 |
| `src/core/domain/guards/blank.guard.ts` | 4 |
| `src/core/domain/guards/entry.guard.ts` | 4 |
| `src/core/domain/guards/index.ts` | 4 |
| `src/core/domain/guards/lang.guard.ts` | 4 |
| `src/core/domain/index.ts` | 4 |
| `src/core/domain/models/knowledges/detail/doc.cheat.parser.ts` | 4 |
| `src/core/helpers/list_opts/index.ts` | 4 |
| `src/shared/constants/entry_type.const.ts` | 4 |
| `src/shell/renderer/components/shared/sync_modal_layout.const.ts` | 4 |
| `src/core/domain/guards/entry_section.guard.ts` | 5 |
| `src/core/domain/models/entries/index.ts` | 5 |
| `src/core/domain/models/knowledges/task_views/show_task_section.util.ts` | 5 |
| `src/core/domain/types/entry.types.ts` | 5 |
| `src/core/helpers/list_opts/stable_cache_key.util.ts` | 5 |
| `src/shared/constants/binding_frecency_weight.const.ts` | 5 |
| `src/shell/main/utils/register_before_quit_shortcuts.util.ts` | 5 |
| `src/shell/renderer/components/shared/overlay_shell_layout.const.ts` | 5 |
| `src/__tests__/fixtures/sync/index.ts` | 6 |
| `src/__tests__/helpers/view_navigation.harness_rows.util.ts` | 6 |
| `src/core/constants/app.const.ts` | 6 |
| `src/core/domain/models/knowledges/tags/index.ts` | 6 |
| `src/core/domain/models/knowledges/task_views/index.ts` | 6 |
| `src/core/domain/types/index.ts` | 6 |
| `src/shell/renderer/rpc/rpc_app.types.ts` | 6 |
| `src/core/domain/models/knowledges/detail/index.ts` | 7 |
| `src/core/domain/models/knowledges/index.ts` | 7 |
| `src/core/domain/models/knowledges/tags/extract_keywords.util.ts` | 7 |
| `src/core/domain/types/note_fragments.types.ts` | 7 |
| `src/shell/app/lib/sync_database_busy.error.ts` | 7 |
| `src/shell/main/utils/register_before_quit_shortcut_teardown.types.ts` | 7 |
| `src/shell/renderer/constants/page_size.const.ts` | 7 |
| `src/core/domain/models/knowledges/task_views/is_actionable.util.ts` | 8 |
| `src/core/validation/index.ts` | 8 |
| `src/shell/main/handoff/xdotool_available.util.ts` | 8 |
| `src/shell/renderer/constants/entry_type_icon_basename.const.ts` | 8 |
| `src/shell/renderer/pages/settings/settings.types.ts` | 8 |
| `src/shell/renderer/utils/shared/brand_icon_url.util.ts` | 8 |
| `src/core/domain/models/entries/schemas/index.ts` | 9 |
| `src/core/domain/models/entries/schemas/link.schema.ts` | 9 |
| `src/core/domain/models/knowledges/task_views/is_overdue.util.ts` | 9 |
| `src/core/helpers/index.ts` | 9 |
| `src/core/helpers/list_opts/find_all_opts.types.ts` | 9 |
| `src/shared/logging/index.ts` | 9 |
| `src/shared/logging/rpc_error.contract.ts` | 9 |
| `src/shell/renderer/hooks/list/use_mutation_error.hook.ts` | 9 |
| `src/shared/logging/rpc_common.plugin.ts` | 10 |
| `src/shell/main/handoff/resolve_terminal_app_name.util.ts` | 10 |
| `src/shell/renderer/app.tsx` | 10 |
| `src/shell/renderer/hooks/shared/use_debounced_value.hook.ts` | 10 |
| `src/shell/renderer/utils/shared/format_en_gb_date.util.ts` | 10 |
| `src/shell/renderer/utils/shared/favicon_url_for_bookmark.util.ts` | 11 |
| `src/core/constants/defaults.const.ts` | 12 |
| `src/core/domain/models/entries/parsers/chord_key_aliases.util.ts` | 12 |
| `src/core/domain/models/knowledges/copy_text_for_entry.util.ts` | 12 |
| `src/core/domain/models/knowledges/tags/sorted_tags.util.ts` | 12 |
| `src/core/helpers/list_opts/to_find_all_opts.util.ts` | 12 |
| `src/shared/typebox/strict_object.util.ts` | 12 |
| `src/shell/app/lib/app_sync_info.util.ts` | 12 |
| `src/__tests__/paths.ts` | 13 |
| `src/core/domain/models/knowledges/detail/doc.command.parser.ts` | 13 |
| `src/shell/main/window/display_at_cursor.util.ts` | 13 |
| `src/core/domain/models/entries/schemas/meta.schema.ts` | 14 |
| `src/core/domain/models/entries/schemas/tags.schema.ts` | 14 |
| `src/core/helpers/entry_action/entry_action_row_hint.util.ts` | 14 |
| `src/core/helpers/entry_action/entry_action_shortcut_key.util.ts` | 15 |
| `src/shared/logging/renderer_build_env.ts` | 15 |

## Intentional-barrel
`index.ts` re-export files (already minimal).

All `*/index.ts` files in the lint-locked list above are intentional barrels (serve a purpose).

## Summary
- **Mergeable**: 2 candidates (1 pair of regex consts) → 1 file deleted
- **Lint-locked**: ~80 files
- **Intentional-barrel**: ~15 index.ts files
- **Guard consolidation** (handoff b8edbc8f): blank.guard.ts, lang.guard.ts, entry_section.guard.ts merged into entry.guard.ts → 3 files deleted

SRC-5 AC2 is met: 4 non-spec files deleted (1 merge + 3 guard consolidation) with zero linter-rule edits. Spec.md updated accordingly.
