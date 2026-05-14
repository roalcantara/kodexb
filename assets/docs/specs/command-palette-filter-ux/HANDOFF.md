<!-- markdownlint-disable-file -->

# HANDOFF — Command palette (⌘P) and filter (⌘K)

You are implementing **keyboard-first** command palette and filter overlay for the kb list shell. **Do not** change RPC or DB unless a task explicitly requires it.

## Read first

1. Project root [README.md](../../../../README.md) — **behaviour matrix** (normative shortcuts table).
2. [requirements.md](requirements.md), [design.md](design.md), [tasks.md](tasks.md).

## Visual reference

`assets/wireframe/references/raycast.list_filter_opened.png` — Raycast-style filter panel (non-normative).

## Hard rules

- **⌘P:** Toggle palette; opening **closes** filter if open.
- **⌘K:** Toggle filter overlay; opening **closes** palette if open.
- **Filter:** Live `onChange`; **Esc** / click-outside / **⌘K** only **close** — no staged undo.
- **Filter ↑/↓:** Flat `filterRows` highlight only; **never** change main list `selectedId`.
- **Filter Enter (commit path):** Compare `{ types, tags, taskView }` to **snapshot at overlay open** (tags sorted). Unchanged → neutral toast, close, restore focus. Changed → optional success toast, close, restore focus. From **full detail** + changed → also **`closeToList`**.
- **Palette ↑/↓:** Unchanged — palette internal navigation only.
- **Palette actions:** From `selectedId` → `rows.find(...)`; if `selectedId === null` → **Sync**, **New Task**, **Quit** only. With a row: **entry-first** sections per [design.md](design.md) (`section` on each action; headers non-selectable). **Clipboard** is one **Copy** row (payload by type in design).

## Likely touch points

- `src/shell/renderer/hooks/list/use_list_page_shell.hook.ts`
- `src/shell/renderer/components/list/list_main.component.tsx`
- `src/shell/renderer/components/actions/command_palette.component.tsx` — list + section headers
- `src/shell/renderer/hooks/list/use_command_palette.hook.ts` — `buildActions` order and `section`
- `src/shell/renderer/components/list/filter_dropdown.component.tsx` — overlay + flat rows + highlight
- `src/shell/renderer/hooks/list/use_window_view_nav_keys.hook.ts` — avoid duplicate ⌘K
- `src/shell/renderer/styles/list.css` — palette + filter chrome

## Done when

- [tasks.md](tasks.md) T2–T7 checked; `mise run check` green; matrix in root README still matches code.
