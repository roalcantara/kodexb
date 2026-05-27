<!-- markdownlint-disable-file -->
# KB v0 — Design Polishing — Design

**Spec slug:** `design-polishing`
**Reads:** [`requirements.md`](./requirements.md)
**Authoritative for:** every "how" decision in this spec. The implementor SHALL NOT re-litigate decisions documented here; if reality contradicts the doc, STOP and escalate.

---

## 1. Overview

This spec realises the **Andromeda Void** design system across the KB renderer by introducing **Tailwind v4** as the styling primitive, mapping every token from [`DESIGN.md`](../../../../DESIGN.md) into a single `@theme` block, migrating every renderer surface onto Tailwind utilities + `@apply` partials, and decomposing the monolithic [`src/shell/renderer/styles/list.css`](../../../../src/shell/renderer/styles/list.css) (2,276 lines) into per-component partials.

The work is **incremental** — one surface per task — so each slice keeps `bun run test` and `bun run dev` green, and review stays tractable. The four product objectives in the original demand map to the five epics in `requirements.md`.

### 1.1 Architectural shape (text diagram)

```
src/shell/renderer/
├── index.ts                       imports only ./styles/app.css + ./app.tsx
├── index.html                     unchanged (loads index.css written by Bun)
├── app.tsx                        unchanged structurally
├── components/                    JSX uses Tailwind utilities + component-partial classes
├── pages/                         same
├── hooks/                         unchanged (behaviour preserved)
└── styles/
    ├── app.css                    @import 'tailwindcss';  @import './theme.css';  @import './components/*.css';
    ├── theme.css                  @theme { --color-*, --text-*, --radius-*, --spacing-*, --font-* } + .semantic-* helpers + keyframes
    ├── components/
    │   ├── app_shell.css          .cmp-app-shell, .cmp-window-drag-stripe (escape hatch for drag affordance)
    │   ├── entry_row.css          .cmp-entry-row, .cmp-entry-row-selected, .cmp-entry-glyph (uses @apply)
    │   ├── list_row.css           .cmp-list-row, .cmp-list-row-selected, .cmp-frecency-bar
    │   ├── footer.css             .cmp-kbd, .cmp-footer-shortcut-row
    │   ├── compact_filter.css     .cmp-compact-filter-option, sticky-facets behaviour
    │   ├── detail_panel.css       .cmp-detail-panel-slide (animation), markdown overrides
    │   ├── settings.css           .cmp-settings-input, .cmp-settings-fieldset
    │   ├── task_sheet.css         .cmp-task-sheet, .cmp-task-sheet-backdrop
    │   ├── confirm_dialog.css     .cmp-confirm-dialog-row
    │   ├── command_palette.css    .cmp-palette-shell, .cmp-palette-item-selected
    │   ├── sync.css               .cmp-sync-progress-bar (accent-color), keyframes link
    │   └── action_toast.css       .cmp-action-toast-success, .cmp-action-toast-error
    └── generated/
        └── app.css                Tailwind CLI output (gitignored, copied by Electrobun)
```

Old `list.css` either disappears or shrinks to `≤ 200 lines` of `/* RETAIN: <reason> */` escape hatches.

### 1.2 What does NOT change

- Renderer component tree, hook signatures, RPC shape, page routes — **untouched**.
- Selection / keyboard navigation behaviour — **untouched** (tests guard this).
- `BrowserWindow` transparency, drag stripe contract (`use_window_drag.hook.ts`) — **untouched**.
- `src/shell/main`, `src/shell/app`, `src/core`, `src/shared` — **untouched**.
- ts/tsx file naming (snake_case + suffix) — **unchanged**.
- TypeBox / Elysia / Eden Treaty / bun:sqlite / Fishery conventions — **unchanged**.

---

## 2. Decision Log (normative)

> **Rule:** Each decision below is binding. If reality requires deviation, the implementor STOPS and escalates rather than guessing.

### D-001 — Tailwind v4 (CSS-first config)

**Context:** Need to pick a styling primitive that matches the wireframe's intent, integrates cleanly with Electrobun's Bun.build-based pipeline, and avoids PostCSS infrastructure debt.

**Options considered:**

1. **Tailwind v3 + PostCSS** — Pros: matches wireframe's CDN syntax 1:1, mature plugin ecosystem (`forms`, `container-queries` used in wireframe). Cons: drags in `postcss`, `autoprefixer`, JS-based config file (drift risk with `DESIGN.md`), slower engine, deprecated migration path.
2. **Tailwind v4 (chosen)** — Pros: CSS-first `@theme` config (DESIGN.md tokens become CSS variables, single source of truth), Lightning CSS bundled (no PostCSS chain), 5-10× faster, native container queries / form-styling without extra plugins (mostly), official long-term path. Cons: wireframe's `?plugins=forms,container-queries` CDN syntax requires translation (trivial).
3. **CDN at runtime** — Forbidden for production builds (network dependency, no purge, blocked by app-bundling story).

**Decision:** **Tailwind v4** at `>=4.0.0 <5.0.0`.
**Rationale:** Aligns with the "single source of truth" principle in `CLAUDE.md`; the wireframe's intent (utility-first, tokenised design) is preserved; we cut PostCSS infrastructure debt.

### D-002 — `@tailwindcss/cli` (NOT a Bun.build plugin)

**Context:** Tailwind v4 publishes four integration paths: `@tailwindcss/cli`, `@tailwindcss/postcss`, `@tailwindcss/vite`, and a JS API. Electrobun bundles via Bun.build — no Vite, no PostCSS chain.

**Options considered:**

1. **Community Bun.build plugin** (e.g. `bun-plugin-tailwind`) — Pros: single build invocation; Cons: third-party, may lag Tailwind releases, opaque to debug, not officially supported by the Tailwind team.
2. **Write a custom Bun.build plugin** wrapping the Tailwind JS API — Pros: zero deps; Cons: maintenance burden, brittle across Tailwind minor releases, not the recommended path.
3. **`@tailwindcss/cli` orchestrated by mise tasks (chosen)** — Pros: officially supported (Tailwind team maintains), single binary, `--watch` mode for dev, separates concerns (Bun bundles JS, Tailwind bundles CSS), survives Tailwind upgrades transparently. Cons: two processes during dev (mitigated by composing them in a single `mise run dev` task).

**Decision:** **`@tailwindcss/cli`** wired into `mise.toml` tasks. Generated CSS lands at `src/shell/renderer/styles/generated/app.css`. Electrobun's `build.copy` (or the renderer entry's `@import`) routes the generated file into the views bundle.

**Rationale:** Officially supported, lowest maintenance burden, transparent failure modes. The two-process dev story is well-precedented in Electron-style stacks and `mise` already orchestrates multi-step workflows in this repo.

### D-003 — Generated CSS imported via `index.ts`, not a `<link>` in `index.html`

**Context:** Bun.build follows `import './foo.css'` from the renderer entry and bundles into a single `index.css`. Electrobun's `index.html` already references `<link rel="stylesheet" href="index.css" />`.

**Decision:** `src/shell/renderer/index.ts` imports `./styles/generated/app.css` (Tailwind output). The HTML stays unchanged.

**Rationale:** Keeps the renderer's CSS surface area inside the Bun.build dependency graph (so `dependency-cruiser` sees it), reuses existing HTML wiring, avoids editing `electrobun.config.ts#build.copy`.

### D-004 — Token-mapping strategy: `@theme` in `theme.css`, no JS config file

**Context:** Tailwind v4 supports two ways to declare design tokens: a CSS `@theme { ... }` block (recommended) or a legacy JS config (`tailwind.config.js`).

**Decision:** Use the CSS `@theme` block in `src/shell/renderer/styles/theme.css`. No `tailwind.config.js` or `tailwind.config.ts`.

**Rationale:** Single source of truth (the file lives next to the styles that use it); aligns with the DESIGN.md frontmatter format (also flat key-value); avoids JS/CSS impedance mismatch; v4 idiomatic.

### D-005 — Migration strategy: incremental, vertical, tracer-bullet slices

**Context:** Migrating ~75 `theme-*` classes across 10+ surfaces could be a single PR (high risk, unreviewable) or split per surface (more PRs but reversible).

**Decision:** One task per visible surface (see §3 Surface Inventory and `tasks.md`). Each task touches the component JSX, its `.spec.tsx`, the new component partial, and removes the corresponding rules from `list.css`. After each task, `bun run test` + `bun run dev` must be green.

**Rationale:** Matches `CLAUDE.md`'s vertical-slice preference; reduces blast radius; keeps the executor honest about behaviour preservation per slice.

### D-006 — Conflict resolution: wireframe wins on layout/spacing, DESIGN.md wins on semantic colour

**Context:** Wireframe and DESIGN.md disagree on multiple visual decisions (colour assignments, body gradient, font families). User decision in planning conversation: **Hybrid**.

**Decision:** Per the explicit conflict-resolution table in §4 below. Where the table is silent, DESIGN.md wins by default (it is versioned as part of the design system).

**Rationale:** Wireframe captures the *rhythm* (gap, padding, height) the team wants; DESIGN.md captures the *semantics* (cyan = command, photon-blue = bookmark). Mixing both gives the best v0.

### D-007 — Helper-class taxonomy: `cmp-*` and `semantic-*`

**Context:** Some patterns repeat across components (selected row, button-primary, kbd chip) and benefit from a single named class; some semantic styles (command, url, cheat, task) must be reusable from JSX.

**Decision:**
- `.cmp-<noun>` — component-level reusable patterns implemented with `@apply` of Tailwind utilities. Live in `components/*.css`.
- `.semantic-<noun>` — semantic styles from DESIGN.md (`command`, `url`, `cheat`, `task-characteristic`). Live in `theme.css` alongside the `@theme` block.

**Rationale:** Two clear prefixes prevent collision with old `.theme-*` selectors during migration; reviewers can grep for either family.

### D-008 — No new hex literals outside `theme.css`

**Context:** Today many `.tsx` and `.css` files hard-code hex values (`#5ECFBE`, `#1E1F2B`, `#a855f7`). DESIGN.md is the source of truth.

**Decision:** A repo-wide rule (enforced by ast-grep optionally; documented in `STYLING_GUIDE.md`): no `#[0-9a-fA-F]{3,8}` literals in renderer source except in `theme.css`, brand-icon basename maps, and test fixtures. Colours come from Tailwind utilities backed by `@theme`.

**Rationale:** Forces drift back to the design system; makes future palette updates one-file changes.

### D-009 — Font loading: system stack only

**Context:** `list.css` currently imports Inter, Google Sans, Google Sans Display, Google Sans Text, JetBrains Mono from Google Fonts CDN. Wireframe imports Inter + Source Code Pro from Google. DESIGN.md prose explicitly states "native macOS system font stack (San Francisco)… zero-latency rendering".

**Decision:** Remove all Google Fonts `@import` URLs. Use system stack: `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` and `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`. Where DESIGN.md names `Inter` (`headline-lg`), fall back to system stack — document this exception in `STYLING_GUIDE.md`. If/when a true Inter is required, bundle the font asset (out of v0 scope).

**Rationale:** Aligns with DESIGN.md's stated "native precision" rationale; removes a network dependency from a desktop app; reduces FOUT/FOIT on slow networks.

### D-010 — `list.css` deletion target: ≤ 200 lines of escape hatches

**Context:** Some CSS doesn't translate cleanly to Tailwind v4 utilities (complex animations, `:webkit-search-decoration` resets, position-sticky behaviour with backdrop-filter, `color-mix()` calls for branding).

**Decision:** After migration, `list.css` is reduced to ≤ 200 lines OR deleted. Every retained block carries `/* RETAIN: <reason> */`. Animations move to `@layer base` inside `theme.css` for clarity.

**Rationale:** A small, justified residual is healthier than forcing every rule through `@apply` and getting unreadable utility soup.

### D-011 — Tests assert on contract, not utility fragments

**Context:** Migration changes class names. Tests asserting `screen.getByText('Foo').classList.contains('theme-entry-row--selected')` will need updates. Should they assert on Tailwind utilities (`bg-row-selected`) or on the new `cmp-*` names?

**Decision:** Tests assert on `cmp-*` class names (component-partial level) OR on semantic role/text — NEVER on raw Tailwind utility fragments (which are volatile under refactor). Where the old test asserted on a stable identifier, the new test asserts on the renamed equivalent.

**Rationale:** Decouples tests from Tailwind's class output; lets future maintainers refactor utilities freely.

### D-012 — Single atomic commit

**Decision:** The implementor lands ALL slices on a single working branch and produces ONE conventional commit at the end. Subject ≤ 50 chars (e.g. `feat(renderer): polish Andromeda Void UI`). Body explains WHAT + WHY + references this spec path. HK pre-commit must pass without `--no-verify`.

**Rationale:** Per `requirements.md#REQ-031` and `assets/guides/GIT_COMMITS_GUIDE.md`. The intra-task slices live on the working branch only — they enable per-slice verification but the history shipped is one atomic step.

---

## 3. Surface Inventory (authoritative)

Every surface below is in scope. The implementor migrates each into a dedicated task in `tasks.md`. The table also maps each surface to the existing `theme-*` classes that must be retired.

| #   | Surface                                  | Primary component(s)                                                                                          | Page(s)         | Pre-migration `theme-*` selector prefixes                                                       | Post-migration home                                                |
| --- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| S1  | App shell + drag stripe                  | `app.tsx` shell wrapper                                                                                       | all             | `theme-app-shell`, `theme-window-drag-stripe`                                                   | `components/app_shell.css`                                         |
| S2  | Search bar + filter chip + back button   | `list_search_filter_chrome.component.tsx`, `toolbar.component.tsx`                                            | list            | `theme-search*`, `theme-toolbar*`, `theme-filter-chip*`                                         | utilities + `components/app_shell.css`                             |
| S3  | List body + entry row + list row         | `list_results_body.component.tsx`, `entry_row.component.tsx` + `list_row` rules                               | list            | `theme-list-*`, `theme-entry-row*`, `theme-list-row*`                                           | utilities + `components/entry_row.css` + `components/list_row.css` |
| S4  | Frecency indicator                       | `entry_row_frecency_indicator.component.tsx`                                                                  | list            | `theme-frecency*`                                                                               | `components/list_row.css`                                          |
| S5  | Footer + keyboard hint strip             | `list_footer.component.tsx`                                                                                   | list            | `theme-footer*`, `theme-empty-state*`                                                           | `components/footer.css`                                            |
| S6  | Compact filter overlay + dropdown        | `compact_filter_overlay.component.tsx`, `filter_dropdown.component.tsx`, `filter_dropdown_tags.component.tsx` | list            | `theme-filter-*`, `theme-compact-filter-*`                                                      | `components/compact_filter.css`                                    |
| S7  | Detail panel (split & full)              | `detail_panel.component.tsx`, pages/detail                                                                    | list & detail   | `theme-detail-*`, `theme-md-view*`, `theme-og-image*`, `theme-dependency-*`, `theme-metadata-*` | `components/detail_panel.css`                                      |
| S8  | Settings page                            | `pages/settings/*.page.tsx`, `components/shared/*` for settings widgets                                       | settings        | `theme-settings-*`, `theme-stats-*`                                                             | `components/settings.css`                                          |
| S9  | Task sheet modal                         | `components/task/*` (task sheet markup), `confirm_dialog` siblings                                            | list & settings | `theme-modal`, `theme-task-sheet*`                                                              | `components/task_sheet.css`                                        |
| S10 | Confirm dialog                           | (currently inline; check `list_overlay_hosts.component.tsx`)                                                  | list            | `theme-confirm-dialog*`                                                                         | `components/confirm_dialog.css`                                    |
| S11 | Command palette (Cmd-K)                  | (locate via grep — currently lives among list overlays)                                                       | global          | `theme-command-palette*`                                                                        | `components/command_palette.css`                                   |
| S12 | Sync progress bar + toast + modal        | (locate via grep on `theme-sync-*`)                                                                           | global          | `theme-sync-*`, `theme-sync-toast*`, `theme-sync-modal*`, `theme-sync-progress*`                | `components/sync.css`                                              |
| S13 | Action toasts                            | (locate via grep on `theme-action-toast`)                                                                     | global          | `theme-action-toast*`                                                                           | `components/action_toast.css`                                      |
| S14 | Drag-over / dragging affordances on rows | `entry_row.component.tsx`                                                                                     | list            | `theme-entry-row--dragging`, `theme-entry-row--drag-over`                                       | `components/entry_row.css`                                         |

> **Implementor note:** Surfaces S11, S12, S13 may live in files whose names don't match the surface prefix. Use `grep -r "theme-command-palette\|theme-sync-\|theme-action-toast" src/shell/renderer --include="*.tsx"` to locate the owning components.

---

## 4. Conflict Resolution Table (DESIGN.md vs wireframe.html)

Where the two sources disagree, the **Winner** column is binding. `wireframe.html` is at `assets/docs/specs/design-polishing/wireframe.html`.

| Aspect                                                   | DESIGN.md                                  | wireframe.html                                            | **Winner**                                                 | Note                                                                                                      |
| -------------------------------------------------------- | ------------------------------------------ | --------------------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Body background                                          | `background: #11121e` (flat)               | Linear gradient `#1E1B33 → #161722 → #10111A`             | **DESIGN.md**                                              | Flat surface keeps the "no shadows / no gradients" tonal-layering principle.                              |
| Selection rail colour                                    | `color-cheat: #a855f7`                     | `border-left: 2px solid #a855f7`                          | **AGREE**                                                  | Use `border-color-cheat`.                                                                                 |
| Selection rail width                                     | "2px vertical line on the left edge"       | `border-left: 2px solid`                                  | **AGREE**                                                  | 2px.                                                                                                      |
| List-row icon for command                                | `#5ECFBE` (Supernova Cyan)                 | `#4ADE80` (green)                                         | **DESIGN.md**                                              | Cyan per Andromeda Void semantic palette.                                                                 |
| List-row icon for bookmark                               | `#3399ff` Photon Blue, underline on URL    | Red YouTube glyph                                         | **DESIGN.md**                                              | Photon Blue + underline. Wireframe's red glyph is a stock illustration.                                   |
| List-row text for cheat/subtitle                         | Muted Lavender/Grey (`#bcc9c5`) — receding | `#D8B4FE` (lavender)                                      | **DESIGN.md**                                              | Receding muted grey per "Semantic Hierarchy".                                                             |
| Task glyph background tile                               | not specified                              | `bg-[#B45309]/80` (warm amber tile)                       | **wireframe**                                              | Treat as ornamental glyph background; map to `bg-priority-high/80` from `@theme` so it's still tokenised. |
| Tag pills (`#task`, `#cli`, …)                           | not enumerated                             | Mixed colours per type                                    | **wireframe layout, DESIGN colours**                       | Use wireframe's italic typography and small gap; pick colours from DESIGN.md semantic table.              |
| Row padding                                              | not specified numerically                  | `px-6 py-4` (~24/16px)                                    | **wireframe**                                              | Adopts wireframe rhythm (more breathing room than today's `padding: 18px 20px`).                          |
| Row gap (icon→body)                                      | not specified                              | `gap-4` (16px)                                            | **wireframe**                                              | Adopts wireframe rhythm.                                                                                  |
| Min row height                                           | not specified                              | implicit from `py-4 + content`                            | **wireframe**                                              | Drop today's fixed `min-height: 90px` and let content drive height.                                       |
| Search input font                                        | `system-ui` for body                       | "Inter" via Google Fonts                                  | **DESIGN.md**                                              | System stack per D-009.                                                                                   |
| Search input size                                        | not specified                              | `text-xl font-medium`                                     | **wireframe**                                              | Adopt wireframe sizing.                                                                                   |
| Footer `kbd` chip style                                  | not specified                              | `rounded bg-white/5 border border-white/10 text-gray-400` | **wireframe**                                              | Adopt; map colours via `@theme` (use `border-outline-variant`, `bg-surface-container-high/40`).           |
| Floating "Alt+Space Command Center" hint below the panel | not specified                              | Present in wireframe                                      | **OUT OF SCOPE**                                           | Document as future enhancement in `handoff.md`. Do not implement in v0.                                   |
| Custom scrollbar (8px, translucent)                      | not specified                              | `.custom-scrollbar::-webkit-scrollbar`                    | **wireframe**                                              | Move into `theme.css` `@layer base`.                                                                      |
| Modal radius                                             | `rounded.md = 6px` for components          | `rounded-xl` on outer panel                               | **DESIGN.md for inner widgets, wireframe for outer shell** | App shell: 12px (matches today's `--theme-shell-radius`); inner widgets: 6px.                             |

> **Default rule** for cases not listed: **DESIGN.md wins on semantic colour, wireframe wins on layout/spacing**. When in doubt, prefer DESIGN.md.

---

## 5. Build Pipeline

### 5.1 Files & responsibilities

| File                                          | Role                                                                                   | Notes                                       |
| --------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------- |
| `package.json`                                | Declares `tailwindcss` + `@tailwindcss/cli`                                            | devDependencies                             |
| `mise.toml`                                   | Declares `styles`, `styles:watch` tasks; composes `dev` and `build*` to depend on them | See §5.2                                    |
| `src/shell/renderer/styles/app.css`           | Tailwind entry source; imports `tailwindcss`, `theme.css`, and component partials      | Authored CSS                                |
| `src/shell/renderer/styles/theme.css`         | `@theme { ... }` block + `.semantic-*` helpers + keyframes                             | Authored CSS                                |
| `src/shell/renderer/styles/components/*.css`  | Per-surface component partials                                                         | Authored CSS                                |
| `src/shell/renderer/styles/generated/app.css` | Tailwind CLI output                                                                    | Gitignored                                  |
| `src/shell/renderer/index.ts`                 | Imports `./styles/generated/app.css`, then `./app.tsx`                                 | Replaces today's `./styles/list.css` import |
| `electrobun.config.ts`                        | Untouched (Bun.build picks up the CSS via `index.ts` import)                           | No change                                   |

### 5.2 Mise tasks (illustrative — final names confirmed in implementation)

```toml
[tasks.styles]
description = "Compile Tailwind v4 CSS once"
run = "bunx @tailwindcss/cli -i src/shell/renderer/styles/app.css -o src/shell/renderer/styles/generated/app.css --minify"

[tasks."styles:watch"]
description = "Compile Tailwind v4 CSS in watch mode"
run = "bunx @tailwindcss/cli -i src/shell/renderer/styles/app.css -o src/shell/renderer/styles/generated/app.css --watch"

[tasks.dev]
depends = ["styles:watch"]
# existing electrobun dev invocation continues here, run in parallel

[tasks.build]
depends = ["styles"]
# existing electrobun build invocation continues here
```

> **If `mise` already defines `dev`/`build`:** wire the dependency via the existing task graph; don't duplicate the Electrobun invocations. Inspect `mise.toml` first.

### 5.3 Generated CSS path & .gitignore

- Output path: `src/shell/renderer/styles/generated/app.css`
- `.gitignore` adds `src/shell/renderer/styles/generated/`
- `knip.jsonc` adds `src/shell/renderer/styles/generated/**` to its ignore list
- `.dependency-cruiser.cjs` — verify the path is allowed (it's a leaf with no imports out, so it should be fine)

### 5.4 Dev workflow

```
mise run dev
├── styles:watch  (background: @tailwindcss/cli --watch)
└── electrobun dev --watch  (foreground)
```

Renderer HMR picks up `generated/app.css` because Bun.build follows the `import './styles/generated/app.css'` graph and re-emits when its mtime changes.

### 5.5 Production workflow

```
bun run build:prod
├── invokes mise task that depends on `styles` (one-shot, --minify)
└── electrobun build --env=stable
```

---

## 6. Token Map: DESIGN.md → `@theme`

`theme.css` is the **single source of truth at runtime**. It mirrors `DESIGN.md`'s frontmatter into Tailwind v4 variable names.

### 6.1 Skeleton

```css
/* src/shell/renderer/styles/theme.css */

@theme {
  /* ── Colours (from DESIGN.md `colors:`) ──────────────────── */
  --color-primary: #5ecfbe;
  --color-bg: #1e1f2b;
  --color-surface: #252733;
  --color-border: #2d2f3d;
  --color-text: #e2e9f5;
  --color-muted: #8892a4;
  --color-row-hover: #2a2c3a;
  --color-row-selected: #252733;
  --color-error: #ef4444;
  --color-warn: #f59e0b;

  --color-color-command: #5ecfbe;
  --color-color-cheat: #a855f7;
  --color-color-task: #ffae57;
  --color-color-url: #3399ff;

  --color-priority-urgent-text: #fca5a5;
  --color-priority-high-border: #fb923c;
  --color-priority-high-text: #fdba74;
  --color-priority-mid-border: #fbbf24;
  --color-priority-mid-text: #fde68a;
  --color-priority-low-border: #22c55e;
  --color-priority-low-text: #86efac;

  --color-status-doing: #93c5fd;
  --color-status-done: #86efac;

  --color-surface-dim: #11121e;
  --color-surface-bright: #373845;
  --color-surface-container-lowest: #0c0d19;
  --color-surface-container-low: #1a1b27;
  --color-surface-container: #1e1f2b;
  --color-surface-container-high: #282935;
  --color-surface-container-highest: #333441;
  --color-on-surface: #e2e1f2;
  --color-on-surface-variant: #bcc9c5;
  --color-inverse-surface: #e2e1f2;
  --color-inverse-on-surface: #2f2f3c;
  --color-outline: #869390;
  --color-outline-variant: #3d4946;
  --color-surface-tint: #69d9c8;

  --color-on-primary: #003731;
  --color-primary-container: #5ecfbe;
  --color-on-primary-container: #00564d;
  --color-inverse-primary: #006b5f;

  --color-secondary: #ddb7ff;
  --color-on-secondary: #490080;
  --color-secondary-container: #6f00be;
  --color-on-secondary-container: #d6a9ff;

  --color-tertiary: #ffd0a5;
  --color-on-tertiary: #4a2800;
  --color-tertiary-container: #fcac55;
  --color-on-tertiary-container: #714100;

  --color-on-error: #690005;
  --color-error-container: #93000a;
  --color-on-error-container: #ffdad6;

  --color-primary-fixed: #86f6e4;
  --color-primary-fixed-dim: #69d9c8;
  --color-on-primary-fixed: #00201c;
  --color-on-primary-fixed-variant: #005047;

  --color-secondary-fixed: #f0dbff;
  --color-secondary-fixed-dim: #ddb7ff;
  --color-on-secondary-fixed: #2c0051;
  --color-on-secondary-fixed-variant: #6900b3;

  --color-tertiary-fixed: #ffdcbe;
  --color-tertiary-fixed-dim: #ffb86f;
  --color-on-tertiary-fixed: #2c1600;
  --color-on-tertiary-fixed-variant: #693c00;

  --color-background: #11121e;
  --color-on-background: #e2e1f2;
  --color-surface-variant: #333441;
  --color-text-main: #e2e9f5;
  --color-text-muted: #8892a4;
  --color-url: #3399ff;
  --color-priority-urgent: #fca5a5;
  --color-priority-high: #fb923c;
  --color-priority-low: #22c55e;

  /* ── Radii (from DESIGN.md `rounded:`) ───────────────────── */
  --radius-xs: 3px;
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 0.75rem;
  --radius-full: 9999px;
  --radius: 0.25rem; /* DEFAULT */

  /* ── Spacing (from DESIGN.md `spacing:`) ─────────────────── */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 12px;
  --spacing-lg: 16px;
  --spacing-xl: 20px;
  --spacing-xxl: 24px;

  /* ── Type scale (from DESIGN.md `typography:`) ───────────── */
  /* Tailwind v4 reads `--text-<name>` for both font-size + line-height
   * when paired with the matching `--text-<name>--line-height` variable. */
  --text-title: 1.25rem;
  --text-title--line-height: 1.2;
  --text-heading: 0.95rem;
  --text-heading--line-height: 1.35;
  --text-body-lg: 0.9rem;
  --text-body-lg--line-height: 1.6;
  --text-body-md: 0.85rem;
  --text-body-md--line-height: 1.6;
  --text-body-sm: 0.8rem;
  --text-body-sm--line-height: 1.5;
  --text-label-lg: 0.75rem;
  --text-label-lg--line-height: 1;
  --text-label-md: 0.7rem;
  --text-label-md--line-height: 1;
  --text-label-sm: 0.65rem;
  --text-label-sm--line-height: 1;
  --text-code: 0.85rem;
  --text-code--line-height: 1.4;

  /* Font families (system stack per D-009) */
  --font-sans: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  --font-serif: Georgia, "Times New Roman", serif;
}

/* ── Semantic helper classes ───────────────────────────────── */

.semantic-command {
  @apply font-mono text-code text-color-command;
}

.semantic-url {
  @apply text-body-md text-color-url underline underline-offset-4;
}

.semantic-cheat {
  @apply text-body-sm text-on-surface-variant;
}

.semantic-task-characteristic {
  @apply text-body-sm text-color-task;
  /* clock icon attached at component level */
}

/* ── Component helper classes used in >1 surface ───────────── */

.cmp-button-primary {
  @apply bg-primary text-white rounded-md px-3 py-2;
}

.cmp-kbd {
  @apply px-2 py-0.5 rounded
         bg-surface-container-high/40
         border border-outline-variant
         text-on-surface-variant
         font-sans text-label-lg;
}

/* ── Animations (escape-hatched from list.css per D-010) ───── */

@layer base {
  html, body { background: transparent; }

  body {
    margin: 0;
    color: var(--color-text);
    font-family: var(--font-sans);
    font-feature-settings: 'cv02', 'cv11', 'ss01';
  }

  /* Custom scrollbar — from wireframe */
  .custom-scrollbar::-webkit-scrollbar { width: 8px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: rgb(255 255 255 / 0.1);
    border-radius: 10px;
  }

  @keyframes theme-pulse {
    from { background-position: 200% 0; }
    to   { background-position: -200% 0; }
  }

  @keyframes theme-progress-indeterminate {
    0%   { width: 0%; margin-left: 0; }
    50%  { width: 60%; margin-left: 20%; }
    100% { width: 0%; margin-left: 100%; }
  }

  @keyframes theme-slide-up {
    from { transform: translateY(100%); opacity: 0; }
    to   { transform: translateY(0); opacity: 1; }
  }
}
```

> **Implementor:** treat the above as a starting skeleton. Fill any gap revealed by the actual `DESIGN.md` keys. If a key has no obvious Tailwind utility prefix mapping, add a comment in `theme.css` explaining the choice.

### 6.2 `app.css` entry shape

```css
/* src/shell/renderer/styles/app.css */

@import 'tailwindcss';

/* Tell Tailwind v4 where to scan for utility usage (defaults are usually
 * enough; this declaration is explicit for review-ability). */
@source './**/*.{ts,tsx,html}';
@source '../**/*.{ts,tsx,html}';

@import './theme.css';

/* Component partials — alphabetical, one per surface */
@import './components/action_toast.css';
@import './components/app_shell.css';
@import './components/command_palette.css';
@import './components/compact_filter.css';
@import './components/confirm_dialog.css';
@import './components/detail_panel.css';
@import './components/entry_row.css';
@import './components/footer.css';
@import './components/list_row.css';
@import './components/settings.css';
@import './components/sync.css';
@import './components/task_sheet.css';
```

---

## 7. Migration Playbook (one component)

Use this pattern for every surface in §3. Each task in `tasks.md` runs through these steps end-to-end before moving on.

### Steps

1. **Locate** the component file and its co-located `.spec.tsx` (file pattern `<noun>.component.tsx` + `<noun>.component.spec.tsx`).
2. **List** the `theme-*` classes referenced by the component (`grep "theme-" <file>`).
3. **Inspect** the matching rules in `list.css` (line ranges).
4. **Read** the wireframe section that maps to this surface (if applicable).
5. **Replace** `theme-*` class names with:
   - Tailwind utilities for trivial atoms (`flex`, `gap-4`, `p-4`, `text-body-md`, `bg-surface-container`).
   - A new `cmp-<noun>-...` class declared in `src/shell/renderer/styles/components/<noun>.css` when:
     - The pattern repeats across rows / sections, OR
     - Pseudo-selectors / animations / media queries are involved, OR
     - The class is asserted on in a test.
6. **Move** the corresponding rules from `list.css` into the new `components/<noun>.css` partial. Rewrite each block to use `@apply` of Tailwind utilities; keep only the imperative bits (animations, media queries, `:webkit-*` pseudo-resets) as raw CSS.
7. **Delete** the migrated block from `list.css`. If the file is now empty, delete `list.css` entirely and remove its `@import` from `index.ts` (already replaced by `app.css` in Task 1).
8. **Update** the `.spec.tsx` to assert on the new `cmp-*` class or on a semantic role — never on raw Tailwind utility fragments (per D-011).
9. **Run** `bun run test`, `bun run lint`, and `bun run dev` (manual smoke). All green → commit slice locally → proceed to next surface.

### Example: footer (S5)

**Before** (`list_footer.component.tsx` — illustrative):

```tsx
<footer className="theme-footer">
  <div>3,992 total entries</div>
  <div className="theme-footer-right">
    <span className="theme-footer-keys">…</span>
  </div>
</footer>
```

**After:**

```tsx
<footer className="cmp-footer">
  <div className="text-label-lg text-muted">3,992 total entries</div>
  <div className="flex items-center gap-1.5">
    <kbd className="cmp-kbd">⌘</kbd>
    <kbd className="cmp-kbd">P</kbd>
    {/* … */}
  </div>
</footer>
```

`components/footer.css`:

```css
.cmp-footer {
  @apply flex justify-between items-center
         px-3 py-1.5
         border-t border-outline-variant/30
         text-label-lg text-muted;
  -webkit-app-region: no-drag; /* RETAIN: app-region is a vendor-prefixed property Tailwind does not express. */
  min-height: 36px;            /* RETAIN: prevents footer height collapse when the back-prefix is `visibility: hidden`. */
}
```

The pattern is repeated per surface. `tasks.md` enumerates the order.

---

## 8. Testing Strategy

### 8.1 What changes in tests

- **DOM assertions on `theme-*` classes** → updated to assert on `cmp-*` classes (component partials).
- **Behavioural / role-based assertions** (`getByRole`, `getByText`) → unchanged.
- **Keyboard hook tests** (`use_window_drag`, `list_keyboard`, `compact_filter_overlay_keyboard`) → unchanged (no class-name dependency).

### 8.2 What does NOT change

- **No new test runner** — continue with `bun test` per `assets/guides/TESTING_GUIDE.md`.
- **No new mocking** — Fishery `factoryFor` + happy-dom continue.
- **No new e2e flows** — existing `e2e:preview` Playwright spec continues to run unchanged.

### 8.3 New assertions to add

- For each component migrated, the `.spec.tsx` SHALL include at least one assertion that the new `cmp-*` class is present on the expected element OR that an aria/role/text contract is preserved.

### 8.4 Visual regression

**Out of scope** for v0 per the in/out scope table. The visual smoke is manual: `bun run dev` + check every page.

---

## 9. Error Handling

This work is presentational; failure modes are constrained.

| Risk                                                  | Symptom                                       | Mitigation                                                                                                                                                                                         |
| ----------------------------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tailwind CLI not running during dev                   | Renderer CSS goes stale, classes don't render | `mise run dev` composes `styles:watch` so the watcher always runs; document in README.                                                                                                             |
| `@theme` token name collides with a Tailwind built-in | Utility doesn't resolve                       | Use the documented `--color-<name>` / `--text-<name>` / `--radius-<name>` / `--spacing-<name>` prefixes only. Token names like `color-task` (not `task`) are namespaced enough to avoid collision. |
| `.spec.tsx` asserts on old class name                 | Test fails after migration                    | Update `.spec.tsx` in the same task as the JSX migration.                                                                                                                                          |
| `dependency-cruiser` flags `generated/app.css`        | Lint fails                                    | Add the generated path to the cruiser's allow list / exclude list.                                                                                                                                 |
| `knip` reports `generated/app.css` as unused          | Lint fails                                    | Add the generated path to `knip.jsonc#ignore`.                                                                                                                                                     |
| HK pre-commit blocks because subject > 50 chars       | Commit aborts                                 | Use the conventional commit subject from D-012.                                                                                                                                                    |
| Production CSS larger than expected                   | App download bloats                           | Tailwind v4's content scan + `--minify` keeps output tight; verify post-build size is < 80 KB for the styles bundle.                                                                               |
| Renderer first paint shows un-styled flash            | UX regression                                 | `app.css` is bundled into `index.css` and linked in `<head>` — no FOUC; verify post-build.                                                                                                         |

---

## 10. Open Items

None. All decisions resolved by `D-001`…`D-012` and the conflict table in §4.

If the implementor encounters a situation not covered above, **STOP** and surface the question — do not pick a direction silently. The hand-off document records this rule.
