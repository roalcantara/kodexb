# Styling guide — renderer (Andromeda Void)

Canonical reference for Tailwind v4 and CSS partials under `src/shell/renderer/styles/`.
Design tokens and surface contracts live in [`DESIGN.md`](../../DESIGN.md).

## Pipeline

- **Source:** `src/shell/renderer/styles/app.css` (Tailwind entry) imports `theme.css` and
  `components/*.css` partials.
- **Build:** `mise run app styles` (add `--watch` during dev) runs `@tailwindcss/cli` and writes
  `src/shell/renderer/styles/generated/app.css` (gitignored).
- **Runtime:** `src/shell/renderer/index.ts` imports `./styles/generated/app.css` only.

`mise run app start` composes Tailwind watch with Electrobun dev via `package.json` `predev`.

## Tokens and helpers

- Define palette, spacing, type scale, overlays, scrims, and shadows in `theme.css` inside
  `@theme { … }` — **once**.
- Use **semantic** classes (`.semantic-command`, `.semantic-url`, …) for entry-type colouring on
  the correct text line — not ad-hoc hex in components.
- Use **`cmp-*`** surface classes in JSX (`.cmp-list-row`, `.cmp-kbd`, …). Co-locate rules in
  `styles/components/<surface>.css` when utilities are insufficient.
- In component partials, reference tokens with **`var(--color-*)`**, **`var(--shadow-*)`**, and
  **`var(--spacing-*)`** only.

## Token hygiene (mandatory)

**Rule (REQ-007, D-008):** `src/shell/renderer/styles/components/*.css` must not contain `#…`,
`rgb(…)`, or `rgba(…)`. All chromatic values belong in `theme.css` `@theme` (or `color-mix` /
`var()` chains defined there).

When you need a new colour:

1. Add `--color-<name>` (or `--shadow-<name>`) to `@theme` in `theme.css` with a one-line comment if
   non-obvious (e.g. wireframe overlay stack).
2. Use `var(--color-<name>)` in the partial.
3. Run `bun run lint:renderer-css`.

```bash
# CI and local full lint include this check
bun run lint:renderer-css
rg '#[0-9a-fA-F]|rgb\(|rgba\(' src/shell/renderer/styles/components  # expect no matches
```

Shared chrome tokens (examples — see `theme.css` for the full set):

| Token                    | Typical use                 |
| ------------------------ | --------------------------- |
| `--color-overlay-faint`  | List row hover              |
| `--color-overlay-subtle` | Selected row fill           |
| `--color-overlay-muted`  | Filter chip, kbd background |
| `--color-overlay-border` | Footer border, chip outline |
| `--color-scrim`          | Modal backdrop              |
| `--color-surface-glass`  | Filter dropdown glass       |
| `--shadow-shell`         | App shell elevation         |

## File layout

| Path                       | Purpose                                                      |
| -------------------------- | ------------------------------------------------------------ |
| `styles/app.css`           | `@import 'tailwindcss'`, `@source`, partial imports          |
| `styles/theme.css`         | `@theme` tokens, `.semantic-*`, shared `.cmp-kbd`            |
| `styles/components/*.css`  | One partial per UI surface (snake_case basename)             |
| `styles/list.css`          | Optional `/* RETAIN: … */` escape hatches only (≤ 200 lines) |
| `styles/generated/app.css` | CLI output — never edit by hand                              |

**ls-lint:** `styles/components/` basenames must match `^[a-z][a-z0-9_]*$`; top-level
`styles/` allows `app`, `theme`, and optionally `list`.

## React conventions

- JSX uses `cmp-*` / `semantic-*` class names, not Tailwind utility strings in TSX (D-011).
- Tests assert **roles** and **`cmp-*` / `semantic-*` hooks**, not generated utility class names.
- No `console.*` in `src/` — use `@shared/logging`.

## Adding a new surface

1. Add or extend tokens in `theme.css` if needed (never in the partial).
2. Create `styles/components/<surface>.css` and `@import` it from `app.css`.
3. Use the partial’s `cmp-*` classes from the matching `.component.tsx`.
4. Run `mise run app styles` and `bun run lint:renderer-css` before commit.
