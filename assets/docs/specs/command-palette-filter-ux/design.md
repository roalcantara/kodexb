<!-- markdownlint-disable-file -->

# Command palette and filter UX — design

Normative technical contract for renderer list shell. Requirements: [requirements.md](requirements.md).

## Command palette sections (entry-first)

Each palette action carries a **`section`** field with one of: `entry` | `clipboard` | `source` | `library` | `app`. The renderer **shall** show a non-interactive **section label** before the first action whose `section` differs from the previous visible action (search filter preserves order; omit a header if it would sit directly above zero visible rows).

Display labels (copy):

| `section`   | Header text |
| ----------- | ----------- |
| `entry`     | This entry  |
| `clipboard` | Clipboard   |
| `source`    | Source      |
| `library`   | Library     |
| `app`       | App         |

**When `selectedId` is null** (no list row): actions **shall** be only **Library** then **App**, in this order: **Sync**, **New Task**, **Quit app**.

When **selectedId** is non-null, vertical order **shall** be:

1. **This entry** — type-specific primary: `bookmark` → Open URL; `command` → Paste in Terminal; `cheat` → *(none — use Clipboard → Copy)*; `task` → Edit Task, then Cycle Status, then Cycle Priority (all `entry`).
2. **Clipboard** — single action **Copy** (`id: copy`). Payload: `bookmark` and `command` copy **`entry.key`** (URL or command line); **`cheat` and `task` copy `entry.doc`** (body / notes live in `doc`). Success toast: **`'<preview>' copied to clipboard`**, where **`preview`** is the copied string trimmed **for display only** to **100** characters, then **`...`** if longer; internal **single quotes** in the preview are shown as **U+2019** so the toast string stays readable. If the copied string is **empty**, toast **`Copied to clipboard`** (neutral, no empty quoted preview). On clipboard API failure, toast **`Copy failed`** (error). **Normative implementation:** payload **shall** use `copyTextForEntry` from `src/core/domain/models/knowledges/copy_text_for_entry.util.ts`; success toast **shall** use `clipboardCopiedToastMessage` from `src/shell/renderer/utils/list/clipboard_copy_toast.util.ts` (palette **Copy** and list **⌘C** / **Ctrl+C** when not in an input — same rules).
3. **Source** — Open in Editor.
4. **Library** — Sync, New Task.
5. **App** — Quit app (always last).

Arrow keys and `selectedIndex` apply **only** to real actions (headers are not listbox options).

## Flat filter row order

Build a memoized **flat array** `filterRows` for keyboard highlight only (live state still drives `onChange`):

1. **Row `all`** — “All (N)” clear / reset semantics match current **All** button (`clearAll`).
2. If task section visible: **task view** rows in fixed order: `actionable`, `today`, `overdue`, `this_week`, `all_pending`, `all_doing` (same as `TASK_VIEWS` in `filter_dropdown.component.tsx`).
3. **Type** rows: `bookmark`, `command`, `cheat`, `task` in that order.
4. **Tag** rows: sorted as today’s `sortedTags(stats.tags, tagQ)` for the compact panel.

Each row exposes: `id` (stable string), `label`, optional `count`, `kind` (`all` | `taskView` | `type` | `tag`), `isOn` (derived from current `types` / `tags` / `taskView`).

**Space** or **Enter** on highlighted row: invoke the same handler as **click** for that row (toggle type/tag/task view or clear all). Does not by itself mean “close overlay” unless the handler also closes (v1: **Enter** on row toggles live; separate **Enter** “confirm close” behavior is **only** when focus is on a dedicated affordance — see below).

**Clarification (v1):** Use **two** Enter semantics in overlay:

- **Enter** with focus on **filter search** field: run **R3 snapshot compare** in `requirements.md` — close overlay, toasts, optional `closeToList` from full detail if changed.
- **Enter** with focus on **highlighted list row** (roving tabindex or `aria-activedescendant`): **toggle** that row (live), **do not** auto-close overlay (Raycast-style drill). User closes with **Esc** or **⌘K** or click-outside, or moves to search and presses **Enter** to commit-close.

If that split is too heavy for v1, alternative documented in `tasks.md`: **Enter** on row both toggles **and** closes with snapshot logic (pick one implementation; tests must match).

## Snapshot equality

```ts
type FilterSnap = { types: EntryTypeOption[]; tags: string[]; taskView?: TaskView }

function normalizeSnap(s: FilterSnap): FilterSnap {
  return {
    types: [...s.types].sort(),
    tags: [...s.tags].sort((a, b) => a.localeCompare(b)),
    taskView: s.taskView
  }
}

function snapsEqual(a: FilterSnap, b: FilterSnap): boolean {
  const x = normalizeSnap(a)
  const y = normalizeSnap(b)
  return (
    x.taskView === y.taskView &&
    x.types.length === y.types.length &&
    x.types.every((t, i) => t === y.types[i]) &&
    x.tags.length === y.tags.length &&
    x.tags.every((t, i) => t === y.tags[i])
  )
}
```

## Full detail + Enter

When `viewState === 'detail'` and filter overlay closes due to **Enter** (commit path from search focus) and `!snapsEqual(current, openSnapshot)`:

- Call **`closeToList()`** (or `retreat` chain that ends in list with `detailEntry` cleared) so user sees filtered results in list layout.

## Capture-phase registration

Register **one** capture listener (or ordered hooks) with priority:

1. If `showSettings || taskSheetVisible`: return (no palette/filter).
2. **⌘P** / **⌘K**: `preventDefault`, toggle respective overlay, close the other if opening.
3. Delegate remaining keys to existing `use_window_view_nav_keys` after ensuring no double-firing.

Do **not** register duplicate `useEffect` listeners for ⌘K in both old cmdk hook and new filter hook.

## Rename migration (machine-checked)

| Legacy                                                                  | New                                                             |
| ----------------------------------------------------------------------- | --------------------------------------------------------------- |
| `src/shell/renderer/components/actions/cmdk_palette.component.tsx`      | `command_palette.component.tsx`                                 |
| `src/shell/renderer/components/actions/cmdk_palette.component.spec.tsx` | `command_palette.component.spec.tsx`                            |
| `src/shell/renderer/hooks/list/use_cmdk_palette.hook.ts`                | `use_command_palette.hook.ts`                                   |
| `src/shell/renderer/hooks/list/use_cmdk_palette.hook.spec.tsx`          | `use_command_palette.hook.spec.tsx`                             |
| `CmdkPalette`, `CmdkPaletteProps`, `CmdkAction`                         | `CommandPalette`, `CommandPaletteProps`, `CommandPaletteAction` |
| CSS classes `app-cmdk`, `app-cmdk-*`                                    | `app-command-palette`, `app-command-palette-*`                  |

Update every import: `list_main.component.tsx`, `use_list_page_shell.hook.ts`, `list.css` (or extracted stylesheet), tests, and any grep hits.

## Related specs

- [shell-window-nav/design.md](../shell-window-nav/design.md)
- [phase-7-detail-view/design.md](../phase-7-detail-view/design.md)
- [raycast-redesign/design.md](../raycast-redesign/design.md) — non-normative if this folder disagrees.
