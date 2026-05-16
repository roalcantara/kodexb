<!-- markdownlint-disable-file -->

# Entry Action Panel — tasks

Requirements: [requirements.md](requirements.md). Design: [design.md](design.md). Plan: [implementation-plan.md](implementation-plan.md).

## T1 — Types and pure panel builder

- [x] `entry_action_panel.types.ts` with `EntryAction`, `EntryActionContext`, sections, rank.
- [x] Core: `entry_action_records_visit`, primary/secondary, `resolve_current_entry`, row hints.
- [x] `build_entry_action_panel.util.ts` + `.spec.ts`: order, sections, primary/secondary ids per type; `entry === null` → library+app only.

## T2 — Executor

- [x] `execute_entry_action.util.ts` + `.spec.ts`: success → `recordEntryVisitFireAndForget`; failure → no visit; core policy for library/app.

## T3 — Shortcut guards

- [x] `entry_action_shortcuts.util.ts` + `.spec.ts`: Return vs mod+Return; allowed in list/split/detail; rejects search/palette/text fields (decision A).

## T4 — Command palette refactor

- [x] `use_command_palette.hook.ts` uses `buildEntryActionPanel` + `executePanelAction`.
- [x] Remove inline `buildActions` switch; palette specs still pass.

## T5 — List Return / ⌘Return

- [x] `use_entry_action_keys.hook.ts` wired via `use_window_view_nav_keys` in `list_main.component.tsx`.
- [ ] Spec: primary on Return in list, split, detail; no-op when search focused.

## T6 — Row hints

- [x] `entry_row.component.tsx` hints from `entryActionPrimaryRowHint` (core).

## T7 — Copy and detail visits

- [x] `use_view_navigation.hook.ts`: copy success via `executeEntryAction`.
- [x] `use_record_detail_visit.hook.ts`: detail id change visit; removed duplicate visits from `advance`/`selectDetailEntry`.

## T8 — Docs and cross-links

- [x] Index entry in `assets/docs/specs/README.md`.
- [x] Cross-link in `list-frecency-sort/requirements.md` R2.

## T9 — Quality gate

- [ ] Targeted `bun test` on new/changed specs.
- [ ] Full `gate.sh` before merge.
