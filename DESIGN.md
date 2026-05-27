---
version: 1.1
name: kb — Andromeda Void
description: |
  Dark-first knowledge base desktop app. Keyboard-first, search-centred, information-dense. Palette: Andromeda Void — deep space navy canvas with jewel-toned semantic accents. Cosmic but precise.
colors:
  primary: '#5ecfbe'
  bg: '#1e1f2b'
  surface: '#252733'
  border: '#2d2f3d'
  text: '#e2e9f5'
  muted: '#8892a4'
  row-hover: '#2a2c3a'
  row-selected: '#252733'
  error: '#ef4444'
  warn: '#f59e0b'
  color-command: '#5ecfbe'
  color-cheat: '#a855f7'
  color-task: '#ffae57'
  color-url: '#3399ff'
  priority-urgent-text: '#fca5a5'
  priority-high-border: '#fb923c'
  priority-high-text: '#fdba74'
  priority-mid-border: '#fbbf24'
  priority-mid-text: '#fde68a'
  priority-low-border: '#22c55e'
  priority-low-text: '#86efac'
  status-doing: '#93c5fd'
  status-done: '#86efac'
  surface-dim: '#11121e'
  surface-bright: '#373845'
  surface-container-lowest: '#0c0d19'
  surface-container-low: '#1a1b27'
  surface-container: '#1e1f2b'
  surface-container-high: '#282935'
  surface-container-highest: '#333441'
  on-surface: '#e2e1f2'
  on-surface-variant: '#bcc9c5'
  inverse-surface: '#e2e1f2'
  inverse-on-surface: '#2f2f3c'
  outline: '#869390'
  outline-variant: '#3d4946'
  surface-tint: '#69d9c8'
  on-primary: '#003731'
  primary-container: '#5ecfbe'
  on-primary-container: '#00564d'
  inverse-primary: '#006b5f'
  secondary: '#ddb7ff'
  on-secondary: '#490080'
  secondary-container: '#6f00be'
  on-secondary-container: '#d6a9ff'
  tertiary: '#ffd0a5'
  on-tertiary: '#4a2800'
  tertiary-container: '#fcac55'
  on-tertiary-container: '#714100'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#86f6e4'
  primary-fixed-dim: '#69d9c8'
  on-primary-fixed: '#00201c'
  on-primary-fixed-variant: '#005047'
  secondary-fixed: '#f0dbff'
  secondary-fixed-dim: '#ddb7ff'
  on-secondary-fixed: '#2c0051'
  on-secondary-fixed-variant: '#6900b3'
  tertiary-fixed: '#ffdcbe'
  tertiary-fixed-dim: '#ffb86f'
  on-tertiary-fixed: '#2c1600'
  on-tertiary-fixed-variant: '#693c00'
  background: '#11121e'
  on-background: '#e2e1f2'
  surface-variant: '#333441'
  text-main: '#e2e9f5'
  text-muted: '#8892a4'
  url: '#3399ff'
  priority-urgent: '#fca5a5'
  priority-high: '#fb923c'
  priority-low: '#22c55e'
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
  code:
    fontFamily: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace
    fontSize: 0.85rem
    fontWeight: 400
    lineHeight: 1.4
  headline-lg:
    fontFamily: Inter
    fontSize: 1.25rem
    fontWeight: '600'
    lineHeight: '1.2'
  heading-md:
    fontFamily: Inter
    fontSize: 0.95rem
    fontWeight: '600'
    lineHeight: '1.35'
semantic_styles:
  command:
    typography: '{typography.code}'
    textColor: '{colors.color-command}'
    description: Executable terminal commands. Sharp, monospace, cyan.
  url:
    typography: '{typography.body-md}'
    textColor: '{colors.color-url}'
    textDecoration: underline
    description: Navigational external links. Blueish and underlined.
  cheat:
    typography: '{typography.body-sm}'
    textColor: '{colors.muted}'
    description: Reference material and subtitles. Thinner, muted sans-serif font
      that recedes in hierarchy.
  task_characteristic:
    typography: '{typography.body-sm}'
    textColor: '{colors.color-task}'
    icon: clock
    description: Temporal characteristics of tasks. Warm orange with intuitive time-based
      indicators.
rounded:
  xs: 3px
  sm: 4px
  md: 6px
  lg: 8px
  full: 9999px
  DEFAULT: 0.25rem
  xl: 0.75rem
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 20px
  xxl: 24px
components:
  button-primary:
    backgroundColor: '{colors.primary}'
    textColor: '#ffffff'
    rounded: '{rounded.md}'
    padding: 0.45rem 0.85rem
  entry-row:
    backgroundColor: transparent
    textColor: '{colors.text}'
    padding: 0.45rem 0.75rem
  entry-row-selected:
    backgroundColor: '{colors.row-selected}'
    borderLeft: 2px solid {colors.color-cheat}
---
<!-- markdownlint-disable-file -->

# kb Design System: Andromeda Void

## Semantic Typography

This system uses specific typographic treatments to convey entry types and metadata characteristics at a glance.

- **Commands**: Styled with `typography.code` in `{colors.color-command}` **_(Supernova Cyan)_**. Used for raw executable strings.
- **URLs**: Styled with `typography.body-md` in `{colors.color-url}` **_(Photon Blue)_** with a standard underline.
- **Cheats / Subtitles**: Styled with `typography.body-sm` in `{colors.muted}` **_(Muted Lavender/Grey)_**. These use a thinner weight and recede visually to provide secondary context.
- **Task Characteristics**: Styled with `typography.body-sm` in `{colors.color-task}` **_(Solar Orange)_**. Often prepended with a clock icon to signify temporal relevance.

## Visual Rhythm

The interface prioritizes razor-thin precision. Selection indicators are `2px` vertical lines on the left edge of the active row, carrying the semantic color of the item type. No heavy borders or box shadows are used for internal list structure.

## Design Rationale

The **Andromeda Void** design system is built on the philosophy of **Focused Precision**. It’s designed to feel less like a generic editor and more like a high-fidelity instrument for developers who live in their terminals.

Here is the **summary** of the core design rationale and concepts:

1. **Color Physics & Depth**

   - **The Foundation:**
     - We use a deep matte charcoal `(#121721 / #1e1f2b)` rather than pure black.
     - This `"Andromeda"` base has a subtle blue-shift that allows the jewel-toned accents to sit `"above"` the surface through color contrast alone.

   - **Tonal Layering:**
     - We strictly avoid shadows and gradients.
     - Depth is achieved exclusively through tonal steps—surfaces sit on top of each other by being one step lighter or darker, maintaining a flat but multi-dimensional technical feel.

2. **Semantic Hierarchy** *(The Jewel Tones)*

Every entry type has a dedicated `"photon"` color, allowing the user to understand the distribution of information at a glance before reading a single word:

  - **Commands:** `(Supernova Cyan - #5ecfbe)`

    - Sharp and executable.
    - Uses monospace typography to signal its technical nature.

  - **Cheats/Subtitles:** `(Muted Lavender/Grey)`

    - Recedes in the hierarchy using a thinner, sans-serif weight to provide context without competing for attention.

  - **Tasks:** `(Solar Orange - #ffae57)`

    - Conveys urgency and time.
    - Paired with temporal icons `(clocks)` to make the state intuitive.

  - **Bookmarks:** `(Photon Blue - #3399ff)`

    - Signals navigational links.
    - These are the only elements with an underline, mimicking standard web affordances but refined for a console UI.

3. **Native Precision**

   - **Typography:**
     - We use a native macOS system font stack **_(San Francisco)_**.
     - This ensures zero-latency rendering and a `"built-for-Mac"` feel.
     - Sizes are kept tight `(0.65rem to 1.25rem)` to maximize information density.

   - **Geometry:**
     - A consistent `6px` radius `(rounded-md)` is applied to all interactive controls, striking a balance between technical sharpness and modern approachability.

2. **Interactive Clarity**

   - **The Selection Rail:**
     - A razor-thin `purple` line on the left is the only indicator of an active row.
     - This avoids the `"heavy"` feel of traditional highlights and keeps the focus on the content.

   - **Keyboard-First Layout:**
     - Everything is designed around a fixed-width list panel that facilitates rapid vertical scanning, identical to the mental model of a **CLI** or **command palette**.

## Conclusion

This system ensures that **kb** is scannable, information-dense, and unmistakably professional.
