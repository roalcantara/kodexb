---
title: Vivid Gothic Command
description: Design system for the project
---
<!-- markdownlint-disable-file -->
colors:
  surface: '#11131e'
  surface-dim: '#11131e'
  surface-bright: '#373845'
  surface-container-lowest: '#0b0e18'
  surface-container-low: '#191b26'
  surface-container: '#1d1f2b'
  surface-container-high: '#272935'
  surface-container-highest: '#323440'
  on-surface: '#e1e1f1'
  on-surface-variant: '#ccc3d3'
  inverse-surface: '#e1e1f1'
  inverse-on-surface: '#2e303c'
  outline: '#968e9c'
  outline-variant: '#4a4451'
  surface-tint: '#d7baff'
  primary: '#d7baff'
  on-primary: '#411478'
  primary-container: '#bd93f9'
  on-primary-container: '#4e2484'
  inverse-primary: '#714aaa'
  secondary: '#75d4e8'
  on-secondary: '#00363e'
  secondary-container: '#008092'
  on-secondary-container: '#f8fdff'
  tertiary: '#ffafd7'
  on-tertiary: '#620044'
  tertiary-container: '#fe78c5'
  on-tertiary-container: '#770054'
  error: '#ffb4ab'
  on-error: '#93000a'
  error-container: '#ef4444'
  on-error-container: '#ffdad6'
  primary-fixed: '#eddcff'
  primary-fixed-dim: '#d7baff'
  on-primary-fixed: '#290055'
  on-primary-fixed-variant: '#593090'
  secondary-fixed: '#a3eeff'
  secondary-fixed-dim: '#75d4e8'
  on-secondary-fixed: '#001f25'
  on-secondary-fixed-variant: '#004e5a'
  tertiary-fixed: '#ffd8e9'
  tertiary-fixed-dim: '#ffafd7'
  on-tertiary-fixed: '#3c0029'
  on-tertiary-fixed-variant: '#860f60'
  background: '#11131e'
  on-background: '#e1e1f1'
  surface-variant: '#323440'
typography:
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
  mono-label:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  container-padding: 16px
  item-gap: 4px
  section-margin: 12px
  inner-padding-x: 12px
  inner-padding-y: 8px
---

## Brand & Style

This design system is a high-octane, Dracula-inspired aesthetic tailored for a command palette launcher. It targets power users, developers, and speed-oriented professionals who demand high legibility and a striking visual identity.

The design style leverages a **Vivid Dark Mode** approach, blending **Glassmorphism** with high-contrast, jewel-toned accents. The interface should feel like a premium command center: deeply saturated, precise, and responsive. We avoid pure blacks in favor of rich navy-purples to maintain a "glowing" digital feel. The emotional response is one of focused energy and technical mastery.

## Colors

The palette is built on the classic Dracula core, optimized for high-density information displays.

- **Primary Selection:** Use `#bd93f9` (Lavender) for active selection states and focus rings.
- **Surface Layering:** The base background is `#282a36`. Use `#44475a` for hovered items or the "Current Line" indicator.
- **Accents:** Use the jewel-toned functional colors (`#8be9fd`, `#50fa7b`, etc.) to categorize different types of commands (e.g., Cyan for System, Green for Tasks).
- **Glass Effects:** The main container should utilize the base color at 80% opacity with a 20px backdrop blur to create a sense of depth over the user's desktop or active application.

## Typography

We utilize **Inter** for its exceptional clarity in small-scale UI.

- **Hierarchy:** Use `headline-sm` for the main input text. `body-md` is the primary style for search results.
- **Muted Text:** Use the Secondary Text color (`#6272a4`) for descriptions, paths, and shortcuts to maintain focus on the primary labels.
- **System Labels:** Use `label-caps` for section headers (e.g., "RECENT COMMANDS").
- **Shortcuts:** Keyboard shortcuts should use a monospaced font if possible, or `mono-label`, to distinguish them from actionable text.

## Layout & Spacing

The command palette follows a **Fixed Width, Vertical Stack** model.

- **Main Container:** Fixed width between 600px and 680px. Centered at the top-third of the screen.
- **Density:** High density. Search results should have a compact vertical height to maximize the number of visible options.
- **Rhythm:** Use an 4px base unit. Result items use `inner-padding-y: 8px` and `inner-padding-x: 12px` to ensure a generous horizontal hit area while maintaining vertical efficiency.
- **Responsive:** On mobile/small viewports, the palette transitions to a full-width bottom sheet or a full-screen overlay with `container-padding: 16px`.

## Elevation & Depth

This system uses **Tonal Layers** combined with **Backdrop Blur** for a modern, sophisticated feel.

- **Main Palette Window:** This is the highest elevation. It uses a 1px border of `#44475a` and a deep, soft shadow (0px 20px 50px rgba(0,0,0,0.5)). The background is a semi-transparent `#282a36`.
- **Selection State:** No shadow. Instead, the active item uses a solid background of `#44475a` and a left-aligned 4px "accent bar" using the Primary color (`#bd93f9`).
- **Input Field:** Integrated into the top of the container without a separate background, separated only by a subtle horizontal divider of `#44475a`.

## Shapes

The shape language is precise and controlled.

- **Main Container:** Uses `rounded-lg` (8px) to soften the large floating window.
- **Result Items & Buttons:** Uses `rounded-sm` (4px) to maintain a professional, sharp aesthetic that fits the high-density layout.
- **KBD/Shortcuts:** Small pills or soft rectangles (4px) that enclose shortcut keys, providing a tactile, mechanical feel.

## Components

### Input Field

The primary search bar is borderless, using a large font size (`headline-sm`). Use the Primary Selection color for the blinking cursor. Placeholder text should be in the Muted color (`#6272a4`).

### Result Items

Items consist of an icon (left), title (Primary Text), description (Muted Text), and shortcut (right). On hover or selection, the background changes to `#44475a`.

### Chips & Tags

Used for categories. They should have a subtle background (15% opacity of the accent color) and a solid text color of that accent (e.g., Pink text on a dark pink tint).

### Keyboard Shortcuts (KBD)

Rendered as small containers with a 1px border of `#6272a4` and `body-sm` mono text. This distinguishes them as non-clickable, reference-only elements.

### Progress Bars / Status Indicators

Use the Green (`#50fa7b`) and Orange (`#ffb86c`) accents for task completion and pending states. These should be thin (2px-4px) lines to stay out of the way of the text.
