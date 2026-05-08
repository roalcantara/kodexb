---
version: alpha
name: kb — Andromeda Void
description: >
  Dark-first knowledge base desktop app. Keyboard-first, search-centred,
  information-dense. Palette: Andromeda Void — deep space navy canvas with
  jewel-toned semantic accents. Cosmic but precise.

colors:
  primary:      "#5ecfbe"
  bg:           "#0b0e14"
  surface:      "#121721"
  border:       "#232936"
  text:         "#e2e9f5"
  muted:        "#8892a4"
  row-hover:    "#1c2537"
  row-selected: "#0f2535"
  error:        "#ef4444"
  warn:         "#f59e0b"
  color-command:  "#5ecfbe"
  color-cheat:    "#a855f7"
  color-task:     "#ffae57"
  color-bookmark: "#3399ff"
  priority-urgent-text: "#fca5a5"
  priority-high-border: "#fb923c"
  priority-high-text:   "#fdba74"
  priority-mid-border:  "#fbbf24"
  priority-mid-text:    "#fde68a"
  priority-low-border:  "#22c55e"
  priority-low-text:    "#86efac"
  status-doing: "#93c5fd"
  status-done:  "#86efac"

typography:
  title:
    fontFamily: system-ui, -apple-system, sans-serif
    fontSize: 1.25rem
    fontWeight: 600
    lineHeight: 1.2
  heading:
    fontFamily: system-ui, -apple-system, sans-serif
    fontSize: 0.95rem
    fontWeight: 600
    lineHeight: 1.35
  body-lg:
    fontFamily: system-ui, -apple-system, sans-serif
    fontSize: 0.9rem
    fontWeight: 400
    lineHeight: 1.6
  body-md:
    fontFamily: system-ui, -apple-system, sans-serif
    fontSize: 0.85rem
    fontWeight: 400
    lineHeight: 1.6
  body-sm:
    fontFamily: system-ui, -apple-system, sans-serif
    fontSize: 0.8rem
    fontWeight: 400
    lineHeight: 1.5
  label-lg:
    fontFamily: system-ui, -apple-system, sans-serif
    fontSize: 0.75rem
    fontWeight: 400
    lineHeight: 1
  label-md:
    fontFamily: system-ui, -apple-system, sans-serif
    fontSize: 0.7rem
    fontWeight: 600
    lineHeight: 1
    letterSpacing: 0.04em
  label-sm:
    fontFamily: system-ui, -apple-system, sans-serif
    fontSize: 0.65rem
    fontWeight: 400
    lineHeight: 1

rounded:
  xs: 3px
  sm: 4px
  md: 6px
  lg: 8px
  full: 9999px

spacing:
  xs:  4px
  sm:  8px
  md:  12px
  lg:  16px
  xl:  20px
  xxl: 24px

components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.bg}"
    rounded: "{rounded.md}"
    padding: 0.45rem 0.85rem
  button-primary-hover:
    backgroundColor: "#44b8a8"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: 0.45rem 0.85rem
  button-secondary-hover:
    backgroundColor: "{colors.row-hover}"
  input:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: 0.4rem 0.5rem
  toolbar-control:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: 0.35rem 0.6rem
  pill:
    backgroundColor: transparent
    textColor: "{colors.muted}"
    rounded: "{rounded.sm}"
    padding: 0.12rem 0.35rem
  filter-dropdown:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    padding: 0.5rem
  entry-row:
    backgroundColor: transparent
    textColor: "{colors.text}"
    padding: 0.45rem 0.75rem
  entry-row-hover:
    backgroundColor: "{colors.row-hover}"
  entry-row-selected:
    backgroundColor: "{colors.row-selected}"
  pill-urgent:
    backgroundColor: transparent
    textColor: "{colors.priority-urgent-text}"
    rounded: "{rounded.sm}"
    padding: 0.12rem 0.35rem
  pill-high:
    backgroundColor: transparent
    textColor: "{colors.priority-high-text}"
    rounded: "{rounded.sm}"
    padding: 0.12rem 0.35rem
  pill-mid:
    backgroundColor: transparent
    textColor: "{colors.priority-mid-text}"
    rounded: "{rounded.sm}"
    padding: 0.12rem 0.35rem
  pill-low:
    backgroundColor: transparent
    textColor: "{colors.priority-low-text}"
    rounded: "{rounded.sm}"
    padding: 0.12rem 0.35rem
  pill-doing:
    backgroundColor: transparent
    textColor: "{colors.status-doing}"
    rounded: "{rounded.sm}"
    padding: 0.12rem 0.35rem
  pill-done:
    backgroundColor: transparent
    textColor: "{colors.status-done}"
    rounded: "{rounded.sm}"
    padding: 0.12rem 0.35rem
---

# kb Design System

## Overview

kb is a keyboard-first, information-dense knowledge base viewer for macOS. The design
language is **Andromeda Void** — a deep space navy canvas where four jewel-toned entry
types create a living, scannable list. Maximum information density; zero decoration.

The emotional register is **focused precision**: a tool that feels like a high-fidelity
instrument, not a generic dark editor. The background has a deliberate blue-shift (11°
hue) that makes the teal, purple, orange, and blue type accents appear to sit above the
surface — information-hierarchy through colour physics, not drop shadows.

Each entry type has its own accent colour so the list communicates type distribution at
a glance before a single word is read. Priority and status states use a traffic-light
hue scale (red → amber → yellow → green) that is readable without colour being the sole
signal.

Target audience: developers and knowledge workers who live in their terminals and expect
desktop tools to behave like them.

## Colors

Deep space navy base with four jewel-toned type accents. Every surface is one tonal
step above the last — depth through tone, never shadow.

- **bg (`#0b0e14`):** The Void. Deepest background. App canvas, input wells, code blocks.
- **surface (`#121721`):** Station deck. Toolbar, detail panel, dropdown menus.
- **border (`#232936`):** Titanium hull. All 1 px dividers. Never heavier.
- **text (`#e2e9f5`):** Starlight white. Primary readable content.
- **muted (`#8892a4`):** Space dust. Secondary labels, metadata, timestamps. Non-critical only.
- **primary (`#5ecfbe`):** Supernova Cyan. Interactive affordances — selected-row indicator,
  primary button fill, links, filter active state.
- **row-hover (`#1c2537`):** Nebula drift. Subtle hover lift.
- **row-selected (`#0f2535`):** Cyan-tinted dark. Selected row background.
- **error (`#ef4444`):** Danger red. Errors, urgent priority, overdue tasks.
- **warn (`#f59e0b`):** Warning amber. Blocked status.

**Entry type accents** — the soul of the palette. Each type glows its own colour in the list:

| Type     | Colour    | Hex        | Feel                      |
| -------- | --------- | ---------- | ------------------------- |
| command  | Cyan      | `#5ecfbe`  | Executable, sharp         |
| cheat    | Purple    | `#a855f7`  | Reference, jewel-toned    |
| task     | Orange    | `#ffae57`  | Action, warmth            |
| bookmark | Blue      | `#3399ff`  | Navigational, photon      |

**Priority hues** (border / text pairs):

| Priority | Border           | Text      |
| -------- | ---------------- | --------- |
| urgent   | `{colors.error}` | `#fca5a5` |
| high     | `#fb923c`        | `#fdba74` |
| mid      | `#fbbf24`        | `#fde68a` |
| low      | `#22c55e`        | `#86efac` |

**Status hues:**

| Status | Color            |
| ------ | ---------------- |
| todo   | `{colors.muted}` |
| doing  | `#93c5fd`        |
| done   | `#86efac`        |

## Typography

System font stack only — `system-ui, -apple-system, sans-serif`. No web fonts, no
download latency, perfect native rendering. San Francisco on macOS.

Sizes follow a dense scale appropriate for an information tool, not a marketing page.
The largest text in the app is the settings panel title (`1.25rem`). Everything else
is `0.65rem`–`0.95rem`.

- **title:** Settings panel and modal headers.
- **heading:** Entry key, section headings in the detail panel. Semi-bold.
- **body-lg / body-md:** Main readable content. `1.6` line-height for comfortable scanning.
- **body-sm:** Code, descriptions, secondary detail fields.
- **label-lg:** Toolbar hints, row sub-text, metadata values.
- **label-md:** Section titles, filter section headers. All-caps, tracked. Semi-bold.
- **label-sm:** Pills and badges. Lowercase forced via CSS.

## Layout

Three responsive breakpoints, all driven by window width:

| Width      | CSS class          | Panels visible                      |
| ---------- | ------------------ | ----------------------------------- |
| < 1050 px  | `layout--compact`  | List only (default launch: 820 px)  |
| ≥ 1050 px  | `layout--comfort`  | List + Detail (content)             |
| ≥ 1300 px  | `layout--expanded` | List + Detail + Metadata sidebar    |

Panel widths:

- **List panel:** ~420 px fixed (implied by 820 − toolbar margins).
- **Detail panel:** `min(780px, 65vw)` — flex, slides in over 180 ms `ease-out`.
- **Metadata sidebar:** 220 px fixed, appears at `≥ 1300 px`.
- **Settings overlay:** `max-width: 720 px`, centred, full-height scroll.

Spacing scale is 4 px base (`xs`), doubling to `sm` (8), `md` (12), `lg` (16), `xl` (20),
`xxl` (24). Row padding is `0.45rem × 0.75rem` — tight enough for density, generous
enough for touch targets.

## Elevation & Depth

Depth is achieved exclusively through tonal layering. There is one exception: the filter
dropdown uses `box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45)` to float above the list.
The modal backdrop is `rgba(0, 0, 0, 0.35)`.

No card shadows. No raised buttons. Surfaces sit on top of each other by colour alone.

## Shapes

All interactive controls use `6px` radius (`{rounded.md}`). This is the canonical corner
for the app: inputs, toolbar buttons, dropdowns, settings fields.

- `3px` (`xs`) — inline code spans only.
- `4px` (`sm`) — pills and badges (small, dense).
- `6px` (`md`) — all controls, buttons, inputs.
- `8px` (`lg`) — floating overlays (filter dropdown, OG image container).
- `9999px` (`full`) — reserved; not currently used.

Do not mix radii within a single component. All four corners of a control must use the
same value.

## Components

**Toolbar controls** (filter button, sync button, settings button, search input): all
share the same token — `bg` fill, `border` stroke, `md` radius. They form a unified
control strip.

**Primary button** (`button-primary`): accent fill, white text. One per view — the single
most important action. Currently: Save in Settings.

**Secondary button** (`button-secondary`): surface fill, text colour, border stroke. Used
alongside primary (Reset, Cancel).

**Input** (`input`): bg fill, text colour, border stroke, `md` radius. No focus ring colour
specified in CSS — add `outline: 2px solid {colors.primary}` on focus for WCAG.

**Entry row** (`entry-row`): transparent background, full-width, left `3px solid transparent`
border. On hover: `row-hover` fill. On selected: `row-selected` fill + `accent` left border.
The left border is the sole selection indicator — do not add additional decorations.

**Pill / badge** (`pill`): transparent background, `border` stroke by default. Semantic
variants override border and text colour using the priority/status hue pairs above.
Always lowercase. Never filled — only the text and border carry the semantic colour.

**Filter dropdown** (`filter-dropdown`): surface fill, border stroke, `lg` radius, drop
shadow. The only floating element with elevation.

## Do's and Don'ts

- **Do** use `{colors.primary}` only for the single most important interactive signal per
  surface (selected row, primary button, active link). Never use it for decoration.
- **Do** use `{colors.muted}` only for non-critical secondary text — labels, timestamps,
  metadata. Never for body copy that the user must read to understand the UI.
- **Do** maintain 4.5:1 contrast ratio for all body text. `{colors.text}` on `{colors.bg}`
  is ≈ 12:1. `{colors.muted}` on `{colors.bg}` is ≈ 4.6:1 — use only at `label-lg` or
  larger; never at `label-sm`.
- **Do** use the `6px` radius (`{rounded.md}`) for all new interactive controls.
- **Do** keep all new layout additions within the existing breakpoint system
  (820 / 1050 / 1300 px). Do not introduce new breakpoints without updating this file.
- **Don't** introduce new accent colours. Semantic states (priority, status) already
  consume the full allowable hue range. A new colour needs a new entry in this file first.
- **Don't** add box-shadows except on floating overlays (dropdowns, modals).
- **Don't** use more than two font weights (`400` body, `600` heading/label-md) on a
  single surface.
- **Don't** use pure white (`#ffffff`) for text — use `{colors.text}` (`#e6e6e6`).
  Exception: white text on the `button-primary` accent fill only.

## Known linter deviations

These warnings are expected and intentional; do not treat them as bugs:

- **button-primary contrast (3.32:1):** `#ffffff` on `#4c8bf5` is below WCAG AA. This
  matches the existing CSS. Future improvement: darken the button fill to `#2563eb` (≈ 4.7:1)
  or switch to dark text. Not changed here to preserve visual consistency with the live app.
- **border / error / warn / priority-\*-border unreferenced:** These palette tokens are
  applied directly as CSS custom properties (`var(--kb-border)`, etc.), not through the
  DESIGN.md component token system. The component schema has no `borderColor` slot, so
  wiring them would generate a different warning. They are intentionally palette-only.
