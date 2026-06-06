<!-- markdownlint-disable-file -->
# Keyboard Shortcuts — design (prototype)

> **Status:** **Superseded** for the `⌘/` trigger by
> [`shortcuts/design.md`](../shortcuts/design.md). In v1 beta, `⌘/` opens the
> **quick-lookup overlay** for imported keymaps, not this App Shortcuts panel.
> App Keyboard Shortcuts remain via Settings and Command palette → App. This
> document stays as historical prototype context for cheat-entry structured
> tables.

## Overview

Two **distinct surfaces** for keyboard shortcut information in kb:

| Surface                    | Purpose                                                                 | Entry point                          |
| -------------------------- | ----------------------------------------------------------------------- | ------------------------------------ |
| **App Keyboard Shortcuts** | kb’s own bindings (navigation, palette, window)                         | Settings or Command palette → App    |
| **Cheat entry detail**     | One imported cheat sheet (e.g. `Common Shortcuts` from `shortcuts.yml`) | List → select cheat → detail / split |

Prototype (static HTML): [`prototype.html`](./prototype.html) — toggle tabs **1 · App shortcuts** / **2 · Cheat entry**.

---

## Page 1 — App Keyboard Shortcuts

**Not** a knowledge list row. A dedicated reference panel (modal sheet or settings sub-page).

### Content

- Grouped sections: Navigation, Actions, Entry (contextual), Window, Help.
- Each row: **label** (+ optional context line) | **platform kbd chips**.
- Platform toggle: macOS (`⌘`) vs Linux (`Ctrl`) — same data as [`assets/wireframe/specs/desktop.md`](../../../wireframe/specs/desktop.md) keyboard table.
- Search filters rows client-side (label + group name).

### UX notes

- Open from: Settings footer link, Command palette action under **App** (`⌘/`
  is **not** used for this surface — see [`shortcuts`](../shortcuts/design.md)).
- Does not replace Cursor/VS Code keybindings (`workbench.action.openGlobalKeybindings`).
- Footer: shortcut count + pointer to palette.

---

## Page 2 — Cheat entry (shortcut collection)

**A normal `cheat` knowledge entry** whose body encodes shortcut maps (YAML blocks in `notes`, as in [`assets/sources/shortcuts.yml`](../../../sources/shortcuts.yml)).

### Default view: structured table

When the parser detects a `shortcuts:` YAML block (or cheat tagged `#shortcuts`):

- Section headings from markdown (`## ZSH`, `## GHOSTTY`, …).
- Table columns: **Keys** (glyph kbd) | **Action** (`desc`) | **Tags** (muted).
- Optional **Focused** / **Notes** columns for rows that define them (Ghostty table in source).

### Fallback: Markdown

Toggle **Structured table** ↔ **Markdown source** (prototype button). If parsing fails, show existing `MdView` only.

### Layout

- Reuses **split/detail** chrome: list column (cheat-filtered) + content + metadata sidebar.
- Action bar matches other entry types: `↵` copy, `⌘↵` secondary, `⌘K` palette.

---

## Data (no new RPC for prototype)

| Surface       | Source                                                                                                    |
| ------------- | --------------------------------------------------------------------------------------------------------- |
| App shortcuts | Static manifest in renderer (generated from wireframe table) or `@shared/keyboard/app_shortcuts.const.ts` |
| Cheat entry   | Existing import pipeline → `Knowledge` row; parse `doc` / `notes` in core                                 |

---

## Out of scope (prototype)

- Editing shortcuts in UI.
- Global OS shortcuts outside kb/Electrobun.
- Syncing with Cursor `keybindings.json`.

---

## Approval

**Prototype only** — no `src/` implementation until **`PROTOTYPE APPROVED: implement`**.
