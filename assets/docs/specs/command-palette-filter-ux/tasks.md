<!-- markdownlint-disable-file -->

# Command palette and filter UX — tasks

Ordered verification. Requirements: [requirements.md](requirements.md). Design: [design.md](design.md).

## T1 — Specs and README

- [x] Behaviour matrix lives in **project root** [README.md](../../../../README.md) (not a spec-folder README).
- [x] This folder contains [requirements.md](requirements.md), [design.md](design.md), [tasks.md](tasks.md), [HANDOFF.md](HANDOFF.md).

## T2 — Rename (`cmdk` → `command_palette`)

- [x] Rename files and symbols per [design.md](design.md) migration table; update imports and CSS.
- [x] `rg cmdk_palette|CmdkPalette|app-cmdk` returns no hits in `src/` (except intentional historical comments if any — prefer zero).

## T3 — Shortcuts and mutual exclusion

- [x] **⌘P** / **Ctrl+P**: toggle palette; when opening palette, close filter if open.
- [x] **⌘K** / **Ctrl+K**: toggle filter overlay; when opening filter, close palette if open.
- [x] While settings or task sheet visible: **⌘P** and **⌘K** no-op (match existing overlay suppression pattern).
- [x] Single capture-phase (or coordinated) registration — no duplicate **⌘K** listeners.

## T4 — Filter overlay behaviour

- [x] Filter remains **live** on change; **Esc** / **⌘K** / click-outside only hide overlay — no rollback.
- [x] **↑/↓** move highlight in flat `filterRows` only; main list **`selectedId`** unchanged while overlay open.
- [x] Snapshot at open: `{ types, tags, taskView }` with tags sorted for compare.
- [x] **Enter** (commit path from **search** focus per [design.md](design.md)): compare to snapshot; neutral vs success toasts; close; restore focus; from **full detail** + changed → **`closeToList`**.
- [x] **Enter** on highlighted **row**: toggle that row (live); does not run commit-close. (Implemented v1: Enter on row toggles live without closing — Raycast-style drill.)

## T5 — Palette behaviour

- [x] **↑/↓** while palette open: palette-only navigation (unchanged semantics).
- [x] Actions from `selectedId` → row in `rows`; `selectedId === null` → global actions only.
- [x] Focus save/restore on palette open/close: save `document.activeElement` before open, restore via `queueMicrotask` + double `rAF` on close.

## T7 — Palette sections (entry-first)

- [x] Each action has `section`; order matches [design.md](design.md) (This entry → Clipboard → Source → Library → App).
- [x] **Clipboard** is a single **Copy** action (`id: copy`); payload and toast per [design.md](design.md) (no duplicate cheat-only copy under This entry).
- [x] Section headers render as non-interactive rows; keyboard highlight skips headers.

## T6 — Quality gate

- [x] `bun test`: 466 pass, 0 fail.
- [x] `bun run typecheck`: clean (pre-existing errors in `detail_view.component.spec.tsx` only).
- [x] `bun run lint` (Biome strict): clean on changed files.
