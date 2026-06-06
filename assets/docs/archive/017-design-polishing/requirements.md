<!-- markdownlint-disable-file -->
# KB v0 — Design Polishing — Requirements

**Spec slug:** `design-polishing`
**Status:** Ready for implementation
**Owner of this artifact:** Planner (handoff to implementor agent)

---

## Goal Statement

| Field                  | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Goal**               | KB v0 ships with Tailwind v4 as the styling primitive, the Andromeda Void design system fully realized across every visible renderer surface, and `src/shell/renderer/styles/list.css` decomposed into per-component Tailwind partials — with no behavioural changes and every existing quality gate preserved.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Success metrics**    | (1) `bun run dev`, `bun run build`, `bun run build:prod` complete with 0 errors and 0 warnings, with Tailwind v4 emitting the renderer's CSS bundle. (2) The renderer ships zero `@import url(https://…)` remote-font directives; all type stacks are system-local or bundled. (3) `src/shell/renderer/styles/list.css` is reduced to ≤ 200 lines of explicitly-retained "escape-hatch" rules each annotated with `/* RETAIN: <reason> */`, or removed entirely. (4) Every surface in the **Surface Inventory** (`design.md` §3) uses Tailwind utilities or `@apply` partials. (5) Andromeda Void semantic colours are sourced exclusively from `@theme` — zero hex literals in renderer source outside `theme.css` (excluding test fixtures and brand-icon basenames). (6) `bun run test` passes 100% with zero skipped tests. (7) `mise run lint` succeeds with 0 errors and 0 warnings (biome, knip, dependency-cruiser, jscpd, ls-lint, ast-grep, hadolint). (8) Every objective in the original demand maps to ≥ 1 acceptance criterion below. |
| **In scope**           | Tailwind v4 install + wiring into Electrobun's two-view build pipeline (dev + prod); `@theme` mapping from `DESIGN.md` (Andromeda Void); migration of every visible surface listed in `design.md` §3; per-component decomposition of `list.css` under `src/shell/renderer/styles/components/`; `.spec.tsx` updates where DOM or class names change; documentation updates in `assets/guides/` only where conventions change; single conventional commit.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Out of scope**       | New product features; behavioural changes; WCAG / accessibility audit; pixel-perfect visual-regression testing; modifications to `DESIGN.md` itself; migration from root `src/` to `apps/kb/`; new Playwright e2e flows beyond the existing `e2e:preview`; performance benchmarking; new RPC routes; bumping any non-styling dependency.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Definition of Done** | Every checkbox in [`assets/guides/DoD.md`](../../../guides/DoD.md) satisfied; single atomic conventional commit with subject ≤ 50 chars per [`assets/guides/GIT_COMMITS_GUIDE.md`](../../../guides/GIT_COMMITS_GUIDE.md); a fresh implementor agent can execute this spec end-to-end without referencing the planning conversation.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Verification**       | `bun run test` • `mise run lint` • `bun run build` • `bun run build:prod` • `bun run dev` (manual smoke — open List, Detail, Settings, TaskSheet, CommandPalette, Sync flows, ConfirmDialog and visually confirm Andromeda Void palette).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

---

## Epics

| Epic   | Theme                                | Requirement range |
| ------ | ------------------------------------ | ----------------- |
| **E1** | Tailwind v4 build integration        | REQ-001 … REQ-006 |
| **E2** | Andromeda Void theme mapping         | REQ-007 … REQ-012 |
| **E3** | Surface migration to Tailwind        | REQ-013 … REQ-022 |
| **E4** | `list.css` refactor & decomposition  | REQ-023 … REQ-026 |
| **E5** | Quality gates, conventions, hand-off | REQ-027 … REQ-031 |

---

## E1 — Tailwind v4 Build Integration

### REQ-001 — Tailwind v4 dependency installed

**User story:** As an implementor, I want Tailwind v4 declared in `package.json` so that the renderer can use Tailwind utilities at compile time.

**Acceptance criteria:**
1. WHEN `bun install` runs THEN `tailwindcss` SHALL be present in `package.json#devDependencies` at version `>=4.0.0 <5.0.0`.
2. WHEN `bun install` runs THEN `@tailwindcss/cli` SHALL be present in `package.json#devDependencies` at a version compatible with the chosen `tailwindcss` version.
3. WHEN the implementor inspects `package.json` THEN no PostCSS-related dependencies (`postcss`, `autoprefixer`, `@tailwindcss/postcss`) SHALL have been added.
4. WHEN `bun install` runs THEN `bun.lock` SHALL be updated and committed.

### REQ-002 — Renderer CSS entry compiles via Tailwind v4

**User story:** As an implementor, I want a single CSS entry that drives the Tailwind v4 engine so that all utilities and theme variables are available to the renderer.

**Acceptance criteria:**
1. WHEN the renderer is built THEN `src/shell/renderer/styles/app.css` SHALL exist and SHALL begin with `@import 'tailwindcss';`.
2. WHEN the renderer is built THEN `src/shell/renderer/styles/theme.css` SHALL exist, SHALL contain the `@theme` block mapping every token defined in REQ-007 through REQ-012, and SHALL be `@import`ed by `app.css`.
3. WHEN `src/shell/renderer/index.ts` is read THEN it SHALL import only `./styles/app.css` for styling (no other `*.css` imports at the renderer entry).
4. WHEN the build runs THEN the legacy `./styles/list.css` import SHALL be removed from `src/shell/renderer/index.ts`.

### REQ-003 — Dev build serves Tailwind output via watch

**User story:** As a developer, I want `bun run dev` to recompile Tailwind output whenever I edit a `.tsx` or `.css` file so I see changes without restarting.

**Acceptance criteria:**
1. WHEN `bun run dev` is invoked THEN Tailwind v4 SHALL run in watch mode (via `@tailwindcss/cli --watch`) and SHALL regenerate the renderer CSS bundle whenever a tracked file changes.
2. WHEN a `.tsx` file under `src/shell/renderer/` is modified THEN the regenerated CSS SHALL be picked up by Electrobun's existing renderer HMR within 2 seconds without a manual restart.
3. WHEN `bun run dev:cef` is invoked THEN the same watch behaviour SHALL apply.
4. WHEN dev mode runs THEN the Tailwind CLI's output SHALL be visible in the dev console with `LOG_LEVEL=verbose` (or higher) so build errors surface alongside Electrobun output.

### REQ-004 — Production build emits a single minified Tailwind bundle

**User story:** As a release engineer, I want production builds to ship a minified CSS bundle so that the app loads quickly and contains no dev-time overhead.

**Acceptance criteria:**
1. WHEN `bun run build` runs THEN Tailwind v4 SHALL execute in non-watch mode and SHALL emit a single CSS file that ends up at `dist/kb.app/Contents/Resources/app/views/shell/index.css` (or the Electrobun equivalent target).
2. WHEN `bun run build:prod` runs THEN the emitted CSS bundle SHALL be minified.
3. WHEN the production build completes THEN the resulting `index.css` SHALL contain no class declarations whose utility prefix is not referenced by a `.tsx`, `.ts`, or `.html` file in `src/shell/renderer/` (Tailwind v4 content scanning verifies this; no manual purge required).
4. WHEN `bun run build:prod` runs THEN the build SHALL fail (non-zero exit) if Tailwind compilation reports any error.

### REQ-005 — Mise tasks orchestrate the dual process

**User story:** As an implementor, I want a single command to start both Tailwind watch and Electrobun watch so that I do not have to remember multiple terminals.

**Acceptance criteria:**
1. WHEN the implementor inspects `mise.toml` THEN a `[tasks.styles]` task SHALL exist that runs `@tailwindcss/cli` against `src/shell/renderer/styles/app.css`.
2. WHEN the implementor inspects `mise.toml` THEN a `[tasks.styles:watch]` task SHALL exist that runs the same CLI with `--watch`.
3. WHEN the implementor inspects `mise.toml` THEN the existing `dev` task SHALL be updated to depend on (or compose with) `styles:watch` so a single invocation starts both watchers.
4. WHEN `bun run build` and `bun run build:prod` complete THEN they SHALL transitively invoke `styles` (non-watch) so production CSS is always regenerated before Electrobun bundles assets.
5. WHEN `mise run styles --kill` (or equivalent) is invoked THEN the watch process SHALL terminate cleanly without orphaning Tailwind.

### REQ-006 — Generated CSS lives outside source tree, ignored by VCS

**User story:** As a maintainer, I want generated CSS to be excluded from git so that diffs stay readable.

**Acceptance criteria:**
1. WHEN Tailwind emits output THEN the file SHALL land at `src/shell/renderer/styles/generated/app.css` (or another path consistent with `build.copy` in `electrobun.config.ts`).
2. WHEN `.gitignore` is inspected THEN the generated CSS path SHALL be ignored.
3. WHEN `dependency-cruiser` runs THEN it SHALL NOT flag the generated CSS as a forbidden dependency.
4. WHEN `knip` runs THEN the generated CSS SHALL NOT be reported as an unused file.

---

## E2 — Andromeda Void Theme Mapping

### REQ-007 — Colour tokens mirror DESIGN.md exactly

**User story:** As a designer, I want every Andromeda Void colour token reachable as a Tailwind utility so that the implementation cannot drift from the design system.

**Acceptance criteria:**
1. WHEN `theme.css` is read THEN it SHALL define a `--color-<token>` CSS variable inside `@theme` for every key in the `colors:` block of `DESIGN.md`'s frontmatter.
2. WHEN a Tailwind utility such as `bg-primary`, `text-color-task`, `border-outline-variant` is used in any `.tsx` THEN it SHALL resolve to the corresponding DESIGN.md hex value.
3. WHEN a renderer source file (excluding `theme.css`, brand-icon basename maps, and `*.spec.tsx` fixtures) is inspected THEN it SHALL contain zero new hex literals (`#[0-9a-fA-F]{3,8}`) — colours come only from utility classes.
4. WHEN the implementor encounters a colour used in `wireframe.html` that is NOT in `DESIGN.md` THEN the conflict SHALL be resolved per the table in `design.md` §4 (DESIGN.md wins on semantic colour); the wireframe value SHALL NOT be added to `@theme`.

### REQ-008 — Typography tokens mirror DESIGN.md

**User story:** As a designer, I want every typography scale entry usable as a Tailwind utility so type stays consistent.

**Acceptance criteria:**
1. WHEN `theme.css` is read THEN every entry in `DESIGN.md`'s `typography:` block (`title`, `heading`, `body-lg`, `body-md`, `body-sm`, `label-lg`, `label-md`, `label-sm`, `code`, `headline-lg`, `heading-md`) SHALL be mapped to a corresponding `--text-<token>` (font-size + line-height) and, where defined, a `--font-<family>` variable.
2. WHEN a Tailwind text-size utility is used (e.g. `text-body-md`, `text-code`) THEN it SHALL apply both the font-size and line-height from DESIGN.md atomically.
3. WHEN the renderer ships THEN it SHALL NOT load any Google Fonts via `@import url(https://fonts.googleapis.com/...)`; the type stack SHALL be the system stack defined in DESIGN.md (`system-ui, -apple-system, sans-serif` + `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`).
4. IF `Inter` is required for `headline-lg` per DESIGN.md THEN the implementor SHALL document the chosen mitigation in `design.md` §6 (either bundle the font asset or fall back to system stack with rationale).

### REQ-009 — Radius tokens mirror DESIGN.md

**User story:** As a designer, I want radius tokens applied consistently so corners stop drifting between components.

**Acceptance criteria:**
1. WHEN `theme.css` is read THEN every entry in `DESIGN.md`'s `rounded:` block (`xs`, `sm`, `md`, `lg`, `full`, `DEFAULT`, `xl`) SHALL be mapped to a corresponding `--radius-<token>` variable.
2. WHEN a Tailwind utility such as `rounded-md` is used THEN it SHALL apply the DESIGN.md value (`6px` for `md`).

### REQ-010 — Spacing tokens mirror DESIGN.md

**User story:** As a designer, I want spacing tokens applied so vertical rhythm matches the spec.

**Acceptance criteria:**
1. WHEN `theme.css` is read THEN every entry in `DESIGN.md`'s `spacing:` block (`xs`, `sm`, `md`, `lg`, `xl`, `xxl`) SHALL be mapped to a `--spacing-<token>` variable OR added as a named entry in the Tailwind spacing scale so utilities like `p-sm` and `gap-lg` resolve to DESIGN.md values.
2. WHEN the implementor uses spacing utilities THEN they SHALL prefer the named tokens over numeric Tailwind utilities for any value that maps to a token; numeric utilities are permitted only for values not in the DESIGN.md scale.

### REQ-011 — Semantic styles encoded as utility classes or `@apply` partials

**User story:** As a designer, I want each semantic style in DESIGN.md (command, url, cheat, task_characteristic) reusable as a single class so they stay consistent across surfaces.

**Acceptance criteria:**
1. WHEN `theme.css` (or a sibling partial) is read THEN four semantic helper classes SHALL exist: `.semantic-command`, `.semantic-url`, `.semantic-cheat`, `.semantic-task-characteristic`.
2. WHEN each helper class is inspected THEN it SHALL `@apply` the typography + colour + decoration combination defined in DESIGN.md's `semantic_styles:` block (e.g. `.semantic-url` applies `text-body-md text-url underline`).
3. WHEN a component renders text that maps to one of these semantic styles THEN it SHALL apply the helper class rather than re-deriving the utilities inline.

### REQ-012 — Component tokens encoded for repeated patterns

**User story:** As an implementor, I want the recurring component patterns from DESIGN.md (button-primary, entry-row, entry-row-selected) callable as named classes so they cannot drift.

**Acceptance criteria:**
1. WHEN the styles tree is read THEN three component helper classes SHALL exist: `.cmp-button-primary`, `.cmp-entry-row`, `.cmp-entry-row-selected`.
2. WHEN `.cmp-button-primary` is inspected THEN it SHALL apply `bg-primary text-white rounded-md` + padding equivalent to `0.45rem 0.85rem`.
3. WHEN `.cmp-entry-row-selected` is inspected THEN it SHALL apply a 2px left border in `color-cheat` (`#a855f7`) on top of the base `.cmp-entry-row`.
4. WHEN selection-row styling is rendered in `EntryRow` or `ListRow` components THEN it SHALL use these classes (or Tailwind utilities that resolve to the same values).

---

## E3 — Surface Migration to Tailwind

Every visible surface in the renderer must be migrated. The **Surface Inventory** (see `design.md` §3) is authoritative for the full list. Each REQ below covers one logical surface; tasks may bundle multiple surfaces into one slice when their components are small.

### REQ-013 — App shell, drag stripe, window chrome

**User story:** As a user, I want the chromeless macOS shell to retain its drag-to-move affordance and rounded floating-panel appearance after the migration.

**Acceptance criteria:**
1. WHEN the app is launched THEN the chromeless floating panel SHALL render with the `--theme-shell-radius` (12px) outer radius (matching the current `.theme-app-shell` selector).
2. WHEN the user presses the title-bar drag stripe (top 10px) THEN window drag SHALL still work via the existing `use_window_drag.hook.ts` (no behaviour change).
3. WHEN the implementor reads `app.tsx` / `app_shell` markup THEN no `.theme-app-shell` or `.theme-window-drag-stripe` class SHALL remain; equivalent Tailwind utilities or component-partial classes SHALL be in use.

### REQ-014 — Search bar + toolbar + filter chip

**User story:** As a user, I want the editorial search field to match the wireframe's PowerToys-style search row while preserving keyboard behaviour.

**Acceptance criteria:**
1. WHEN the list page is rendered THEN the search input SHALL match the wireframe's layout: full-width transparent input, optional back button, filter chip on the right, 52px min-height.
2. WHEN the user focuses the search input THEN the focus ring SHALL be visible (Tailwind `focus-visible:ring-…` utility) and SHALL be subtle.
3. WHEN the search input is empty THEN the placeholder SHALL render in `text-muted` with italic style per the current CSS contract.
4. WHEN the filter chip is active THEN it SHALL render with `text-accent` + 10%-opacity `accent` background (per current `theme-filter-chip--active`).

### REQ-015 — List body and entry/list rows

**User story:** As a user, I want list rows to feel like the wireframe (taller, more breathing room) while keeping the semantic colour rail per DESIGN.md.

**Acceptance criteria:**
1. WHEN a list row is rendered THEN it SHALL adopt the wireframe's spacing (gap-4, py-4, px-6) and the wireframe's row layout (icon column + body + trailing column).
2. WHEN a list row is selected THEN it SHALL render a `2px` left rail in `color-cheat` (`#a855f7`) and a `surface-container-highest` (or wireframe-equivalent) row background.
3. WHEN a list row is hovered AND another row is selected THEN the hovered row SHALL NOT render a secondary highlight (preserving current `data-list-selection='true'` behaviour).
4. WHEN the row's entry type is determined THEN the icon glyph SHALL use the semantic colour for that type per DESIGN.md (command → cyan, task → solar-orange, cheat → muted, bookmark → photon-blue + underline on URL).
5. WHEN the row renders the trailing frecency indicator THEN it SHALL preserve its current three-bar visualization with `accent`-coloured "on" bars.

### REQ-016 — Footer & keyboard shortcut hint strip

**User story:** As a user, I want the footer to expose keyboard shortcuts in the wireframe's `kbd` chip style.

**Acceptance criteria:**
1. WHEN the list page footer is rendered THEN it SHALL adopt the wireframe's footer treatment: pagination summary on the left, keyboard-shortcut `kbd` chips on the right.
2. WHEN a `kbd` element is rendered THEN it SHALL use a single reusable Tailwind component class or utility composition matching the wireframe's pill style (`rounded` + `bg-white/5` + `border border-white/10` + `text-muted`).
3. WHEN the footer's `⎋` (back) prefix is inactive THEN it SHALL retain `visibility: hidden` (no layout shift) per the current contract.

### REQ-017 — Compact filter dropdown + overlay

**User story:** As a user, I want the compact filter dropdown to keep its current keyboard navigation and visual rhythm while using Tailwind primitives.

**Acceptance criteria:**
1. WHEN the compact-filter overlay opens THEN it SHALL render as a portal under `document.body` using the existing keyboard hook (`compact_filter_overlay_keyboard.util.ts`).
2. WHEN the overlay renders a section header THEN it SHALL use the wireframe's section-title type scale (`text-label-md uppercase tracking-wide text-muted`).
3. WHEN a filter row is highlighted via keyboard navigation THEN it SHALL render the `accent` left rail and tinted background per the current `.theme-compact-filter-option--highlight` behaviour.
4. WHEN the overlay's sticky facets header is visible THEN it SHALL retain its position-sticky behaviour and `surface-container` backdrop.

### REQ-018 — Detail panel (split view)

**User story:** As a user, I want the slide-in detail panel to keep its slide animation and use Andromeda Void surfaces.

**Acceptance criteria:**
1. WHEN a list row is opened THEN the detail panel SHALL slide in from the right with the same width and transition as today (`min(780px, 65vw)`, 180ms ease-out).
2. WHEN the detail panel renders header, body, OG image, dependency graph, metadata sidebar, links section, markdown view THEN each subsection SHALL use Tailwind utilities; existing tests for these subcomponents SHALL pass without modification beyond class-name updates.
3. WHEN a markdown link is rendered THEN it SHALL use the `.semantic-url` helper class (per REQ-011).
4. WHEN the metadata sidebar is shown at viewport ≥ 1300px THEN it SHALL be hidden below that breakpoint (preserving current responsive behaviour).

### REQ-019 — Settings page & form controls

**User story:** As a user, I want the settings page to render readable form controls using the new token system.

**Acceptance criteria:**
1. WHEN the settings page is open THEN headings SHALL use `text-label-md uppercase tracking-wide text-muted` (matching DESIGN.md heading treatment).
2. WHEN a settings input is rendered THEN it SHALL adopt a single reusable input class (utility composition or `@apply` partial) sourced from DESIGN.md tokens.
3. WHEN the settings page renders the primary action button THEN it SHALL use the `.cmp-button-primary` class (per REQ-012).
4. WHEN the implementor inspects the settings markup THEN every `theme-settings-*` class SHALL be removed in favour of utilities or component partials.

### REQ-020 — Task sheet modal + confirm dialog

**User story:** As a user, I want modal dialogs to render with the new surface tokens and remain keyboard-dismissable.

**Acceptance criteria:**
1. WHEN the task sheet opens THEN the backdrop SHALL render with `bg-black/60` over a centred `surface-container` panel matching the wireframe's modal-style radii.
2. WHEN the confirm dialog renders the danger action THEN it SHALL use a `border-error` + `text-priority-urgent` treatment per DESIGN.md.
3. WHEN either dialog is closed THEN focus SHALL return to the previous element (no regression vs current behaviour).
4. WHEN form fields inside the task sheet are rendered THEN they SHALL use the same reusable input class introduced in REQ-019.

### REQ-021 — Command palette (Cmd-K) surface

**User story:** As a user, I want Cmd-K palette items to render with the new token system and the semantic colour cues from DESIGN.md.

**Acceptance criteria:**
1. WHEN the command palette opens THEN it SHALL render at the same dimensions (480 × ≤400px) on a centred `surface-container` panel with `rounded-md`.
2. WHEN a palette item's shortcut hint is rendered THEN it SHALL use the same `kbd` class introduced in REQ-016.
3. WHEN a palette item is selected via keyboard THEN it SHALL render a tinted background derived from `accent` (matching current `color-mix(in srgb, var(--theme-accent) 20%, transparent)` via Tailwind opacity utilities like `bg-accent/20`).

### REQ-022 — Sync progress, sync modal, sync toast, action toasts

**User story:** As a user, I want sync feedback surfaces to render consistently with the new design tokens.

**Acceptance criteria:**
1. WHEN sync progress renders THEN the progress bar SHALL use `accent-color: var(--color-accent)` (or its Tailwind equivalent) and SHALL preserve the indeterminate-animation keyframes (`theme-progress-indeterminate`) — keyframes may move into the `theme.css` `@layer base` block.
2. WHEN the sync modal renders THEN the path block, log rows, error banner, and summary list SHALL each use Tailwind utilities; the modal SHALL remain scrollable and centred per current contract.
3. WHEN an action toast renders THEN it SHALL slide up using the existing `theme-slide-up` keyframes (move keyframes to `@layer base`) and SHALL pick `border-primary` or `border-error` per `--success` / `--error` variant.
4. WHEN multiple toasts stack THEN they SHALL stack `column-reverse` per current behaviour with `gap-2`.

---

## E4 — list.css Refactor & Decomposition

### REQ-023 — Per-component partial layout under `src/shell/renderer/styles/components/`

**User story:** As a maintainer, I want CSS partials co-located with their components by name so I can find them.

**Acceptance criteria:**
1. WHEN the implementor inspects `src/shell/renderer/styles/` THEN it SHALL contain `app.css`, `theme.css`, and a `components/` subdirectory.
2. WHEN `components/` is inspected THEN every file SHALL be snake_case with the `.css` extension and named after the component or surface it styles (e.g. `entry_row.css`, `list_row.css`, `detail_panel.css`, `settings.css`, `task_sheet.css`, `command_palette.css`, `sync.css`, `action_toast.css`, `compact_filter.css`, `confirm_dialog.css`, `app_shell.css`).
3. WHEN a component partial exists THEN it SHALL be `@import`ed exactly once by `app.css` in alphabetical order.
4. WHEN a partial declares classes THEN those classes SHALL use `@apply` of Tailwind utilities; raw CSS is permitted only for animations, pseudo-element resets, vendor-prefixed properties, or behaviour that Tailwind v4 does not express natively (and SHALL be annotated `/* RETAIN: <reason> */`).

### REQ-024 — Legacy `list.css` removed or reduced to escape hatches

**User story:** As a maintainer, I want the legacy monolithic CSS gone so future contributors do not edit it by accident.

**Acceptance criteria:**
1. WHEN the implementor inspects `src/shell/renderer/styles/list.css` THEN the file SHALL either be deleted OR reduced to ≤ 200 lines of escape-hatch CSS, each block annotated `/* RETAIN: <reason> */`.
2. WHEN any `theme-*` class remains in renderer JSX THEN that class SHALL be defined either in a component partial under `components/` or in the trimmed `list.css` escape-hatch zone — never in both.
3. WHEN the implementor runs `grep -r "theme-" src/shell/renderer --include="*.tsx" --include="*.ts" | wc -l` after migration THEN the count SHALL be lower than the pre-migration count for every component file that was migrated.

### REQ-025 — ls-lint rules updated for the new directory

**User story:** As a maintainer, I want the new `components/` directory under styles to be governed by ls-lint so future additions stay snake_case.

**Acceptance criteria:**
1. WHEN `.ls-lint.yml` is inspected THEN it SHALL include a rule for `src/shell/renderer/styles/components` enforcing `.css: regex:^[a-z][a-z0-9_]*$`.
2. WHEN `.ls-lint.yml` is inspected THEN it SHALL include a rule for `src/shell/renderer/styles` allowing the names `app`, `theme`, and (if retained) `list` for `.css` files.
3. WHEN `bun run lint:ls` runs THEN it SHALL pass with 0 errors.

### REQ-026 — Generated CSS excluded from quality gates

**User story:** As a maintainer, I want CI gates to ignore generated CSS so they don't flag it as dead.

**Acceptance criteria:**
1. WHEN `knip.jsonc` is inspected THEN the Tailwind-generated CSS path SHALL be in the ignore list.
2. WHEN `.dependency-cruiser.cjs` runs THEN the generated CSS path SHALL NOT appear in violations.
3. WHEN `bun run lint:depcruise` runs THEN it SHALL pass with 0 errors.
4. WHEN `bun run lint:knip` runs THEN it SHALL NOT report the generated CSS file.

---

## E5 — Quality Gates, Conventions & Hand-off

### REQ-027 — All existing tests pass without skips

**User story:** As a release engineer, I want behaviour preserved so the migration is provably non-breaking.

**Acceptance criteria:**
1. WHEN `bun run test` runs THEN every existing `.spec.ts(x)` file under `src/` and `tools/` SHALL pass; total skipped count SHALL be 0.
2. WHEN a component's DOM structure changes during migration THEN its co-located `.spec.tsx` SHALL be updated atomically in the same task; tests SHALL NOT be skipped or marked `todo`.
3. WHEN a component swaps from a `theme-*` class name to a Tailwind utility composition THEN any test asserting on the old class name SHALL be updated to assert on the new contract (semantic role, text, or a stable component-partial class) — never relying on Tailwind utility fragments that may change.

### REQ-028 — `console.*` ban preserved in renderer

**User story:** As a maintainer, I want the existing `console.*` ban to remain enforced.

**Acceptance criteria:**
1. WHEN the implementor inspects renderer source THEN no new `console.*` call SHALL appear; logging continues via `getLogger(['kb', 'renderer', ...])` from `@shared/logging`.
2. WHEN `mise run lint` runs THEN any rule banning `console.*` SHALL continue to pass.

### REQ-029 — Dependency boundaries unchanged

**User story:** As a maintainer, I want FCIS layer boundaries unchanged by this work.

**Acceptance criteria:**
1. WHEN `bun run lint:depcruise` runs THEN there SHALL be 0 new forbidden-imports violations; the renderer SHALL continue to talk to the main process only through `@rpc/client`.
2. WHEN the implementor inspects new files THEN no new import SHALL cross a layer boundary (`renderer/` → `shell/app/`, `core/` → `shell/`, `shared/` → `shell/`).

### REQ-030 — Documentation updates

**User story:** As a maintainer, I want the codestyle and CLAUDE.md surfaces to reflect the new styling rules so future contributors do the right thing.

**Acceptance criteria:**
1. WHEN `CLAUDE.md` is inspected after migration THEN it SHALL reference Tailwind v4 + Andromeda Void tokens in the styling section, and SHALL link to `assets/guides/STYLING_GUIDE.md` if one is created.
2. WHEN `assets/guides/CODESTYLE_GUIDE.md` is inspected THEN it SHALL include the new styles directory naming contract.
3. WHEN `README.md` is inspected THEN its development-instructions section SHALL mention `mise run styles:watch` (or the chosen task name) if the dev workflow requires manual invocation; otherwise it SHALL note the integrated `bun run dev` flow.
4. IF a new `assets/guides/STYLING_GUIDE.md` is created THEN it SHALL document: where tokens live, how to add a new component partial, the migration playbook used, and the "no hex literals outside theme.css" rule.

### REQ-031 — Single atomic conventional commit

**User story:** As a reviewer, I want the entire migration to land as one well-described commit so history is auditable.

**Acceptance criteria:**
1. WHEN the implementor finishes THEN they SHALL produce a single git commit covering all migration changes.
2. WHEN the commit message is inspected THEN its subject SHALL match Conventional Commits format with type `feat` or `refactor`, optional scope `(renderer)`, and SHALL be ≤ 50 characters.
3. WHEN the commit body is inspected THEN it SHALL explain WHAT changed (Tailwind v4 added, Andromeda Void theme realised, list.css decomposed) and WHY (v0 design polish, single source of truth, maintainability), and SHALL reference the spec path `assets/docs/archive/design-polishing/`.
4. WHEN the commit lands THEN HK pre-commit hooks SHALL pass without `--no-verify`.

---

## Traceability matrix (objectives → requirements)

| Original objective                | Requirements that satisfy it                                     |
| --------------------------------- | ---------------------------------------------------------------- |
| 1. Tailwind CSS Integration       | REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006             |
| 2. Prototype Integration          | REQ-013 … REQ-022 (all surfaces), plus REQ-011 (semantic styles) |
| 3. CSS Refactor & Migration       | REQ-023, REQ-024, REQ-025, REQ-026 (plus all of E3)              |
| 4. Validation & Quality Assurance | REQ-027, REQ-028, REQ-029, REQ-030, REQ-031                      |
