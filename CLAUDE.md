<!-- markdownlint-disable-file -->
# kb — Claude Code instructions

## Stack

Bun runtime. Electrobun desktop framework (macOS + Linux). React 19 renderer.
Elysia + Eden Treaty for RPC. TypeBox for **all** validation (transport,
core domain, config). Zod is **not** a dependency.
`bun:sqlite` directly — no Drizzle ORM, no drizzle-typebox, no drizzle-kit,
no drizzle-seed. Fishery `factoryFor` for typed test factories; YAML
fixtures only for end-to-end import tests. See
[`assets/docs/specs/foundation/design.md`](assets/docs/specs/foundation/design.md)
Decisions 2–5 for the rationale.

## Architecture — FCIS layers

```
src/core/        Pure functions. No I/O. No side-effects.
src/shared/      Pure utilities and types. No I/O.
src/shell/app/   AppService + DB. All I/O except UI.
src/shell/main/  Electrobun main process. Boots app, hosts Elysia RPC server.
src/shell/renderer/  React UI. Calls main via Eden Treaty client ONLY.
```

**Forbidden imports** (dependency-cruiser + ast-grep enforce these):

- `renderer/` → `shell/app/` : use `@rpc/client` (Eden Treaty)
- `core/` → `shell/` : pure functions must not import I/O
- `shared/` → `shell/` : shared utilities must not import I/O
- `*.routes.ts` → `*.repository.ts` directly : must go through AppService

## Non-negotiable conventions

- **Validation everywhere**: use TypeBox (`t.*` in Elysia routes,
  `Type.Object` + `Value.Check` in core / config). Never `z.*` — `zod` is
  not a dependency.
- **Database**: use `bun:sqlite` directly with typed prepared statements
  (`db.query<RowType, [Params]>(sql)`). No Drizzle ORM, no drizzle-kit,
  no drizzle-typebox.
- **Test factories**: Fishery via `factoryFor` from `@testing` for typed
  domain rows (`Knowledge` variants, `Env`, `RawConfig`, `LoadedConfig`).
  YAML fixtures under `src/__tests__/fixtures/sample/` only for `ImportService`
  end-to-end specs. No drizzle-seed. See
  [`assets/guides/FISHERY_GUIDE.md`](assets/guides/FISHERY_GUIDE.md) and
  [`assets/guides/TESTING_GUIDE.md`](assets/guides/TESTING_GUIDE.md).
- **Logging**: use `createLogger()` from `@shared/logging`. Never `console.*` in `src/`.
- **Every new Elysia route** must also appear in `tools/preview/server.ts`.
- **Every new file** in `src/` needs a co-located `.spec.ts(x)`.
- **Exports**: unused exports are a knip error — delete or use before committing.

## Naming conventions

File and folder naming is **machine-checked** by Biome (snake_case on every
dot-separated segment) and `@ls-lint/ls-lint` (directory ↔ suffix contract,
see `.ls-lint.yml`). The full canonical suffix vocabulary lives in
[`assets/guides/CODESTYLE_GUIDE.md`](assets/guides/CODESTYLE_GUIDE.md)
§File Naming. Common cases:

| Artifact           | Pattern                       | Example                            |
| ------------------ | ----------------------------- | ---------------------------------- |
| React components   | `<snake_case>.component.tsx`  | `entry_row.component.tsx`          |
| React pages        | `<snake_case>.page.tsx`       | `list.page.tsx`, `detail.page.tsx` |
| React hooks        | `use_<snake_case>.hook.ts(x)` | `use_list_selection.hook.ts`       |
| Elysia route files | `<snake_case>.routes.ts`      | `entries.routes.ts`                |
| Test files         | same name + `.spec.ts(x)`     | `entry_row.component.spec.tsx`     |
| End-to-end tests   | same name + `.e2e.spec.ts`    | `import.e2e.spec.ts`               |

## Skills to load

Load these at the start of any kb task:

- `kb-context` — always (architecture + naming + design system)
- `kb-rpc` — when touching Elysia routes or the Eden Treaty client
- `kb-testing` — when writing or modifying tests
- `kb-quality-gate` — before marking anything done

Optional companion skills for narrower situations:

- `systematic-debugging` — before fixing failing tests, gate failures, or
  unexpected behavior
- `elysia` — for Elysia route mechanics, after `kb-rpc`
- `receiving-code-review` — when applying review feedback
- `requesting-code-review` — before review handoff or PR preparation
- `mise-tasks` — when editing `mise.toml` or task orchestration
- `mise-expert` — when editing mise tool versions or environment setup
- `ast-grep` — when debugging or authoring structural search rules
- `knip` — when handling unused exports, files, or dependencies
- `jscpd` — when investigating duplication findings
- `dry-principle` — when duplication findings need extraction judgment
- `solid-principles` — when reviewing module or class design
- `react:components` — when translating a design artifact into renderer
  components, adapted to kb's renderer conventions
- `stitch-design` — for design intake or prototypes, under the prototype gate
- `using-git-worktrees` — only when isolated parallel work is requested or
  approved
- `verification-before-completion` — as a reminder; `kb-quality-gate` remains
  the executable authority

Skill adoption and routing rationale lives in
[`assets/guides/SKILLS.md`](assets/guides/SKILLS.md). Project skills and
approved symlinks live at `.agents/skills/`; `mise run link:skills` syncs only
the linked companions named there. Other optional companions remain global at
`~/.agents/skills/`.

## Reference docs

The guides under [`assets/guides/`](assets/guides/) are the canonical source
of truth for every convention in this file. If the guides ever disagree
with this `CLAUDE.md`, **the guides win** — open a PR to fix `CLAUDE.md`.

- [`assets/guides/CODESTYLE_GUIDE.md`](assets/guides/CODESTYLE_GUIDE.md) — naming, FCIS layout, SOLID
- [`assets/guides/TESTING_GUIDE.md`](assets/guides/TESTING_GUIDE.md) — bun:test, Better Specs, no-mock rule
- [`assets/guides/FISHERY_GUIDE.md`](assets/guides/FISHERY_GUIDE.md) — `factoryFor` usage and registry
- [`assets/guides/FCIS.guide.md`](assets/guides/FCIS.guide.md) — pure core / imperative shell rules
- [`assets/guides/DoD.md`](assets/guides/DoD.md) — Definition of Done (gated by `kb-quality-gate`)
- [`assets/guides/GIT_COMMITS_GUIDE.md`](assets/guides/GIT_COMMITS_GUIDE.md) — Conventional Commits, ≤ 50-char subject
- [`assets/guides/MISE_GUIDE.md`](assets/guides/MISE_GUIDE.md) — when to use `mise run` vs `bun run`
- [`assets/guides/SKILLS.md`](assets/guides/SKILLS.md) — skill adoption ledger, routing rationale, optional companions
- [`assets/guides/CI_GUIDE.md`](assets/guides/CI_GUIDE.md) — review/release/publish workflows
- [`assets/guides/BUN_RUNTIME.md`](assets/guides/BUN_RUNTIME.md) — Bun YAML/JSON5/SQLite quick reference
- [`assets/guides/ELECTROBUN.md`](assets/guides/ELECTROBUN.md) — Electrobun official-docs map + RPC shape

Foundation specs:

- [`assets/docs/specs/foundation/design.md`](assets/docs/specs/foundation/design.md) — architecture decisions, layer rules, RPC contract
- [`assets/docs/specs/foundation/requirements.md`](assets/docs/specs/foundation/requirements.md) — EARS specs V1-1 through V1-8
- [`assets/docs/specs/foundation/roadmap.md`](assets/docs/specs/foundation/roadmap.md) — phase sequence, skills per phase, development loop

Feature specs and plans belong under [`assets/docs/specs/`](assets/docs/specs/) (see [`assets/docs/specs/README.md`](assets/docs/specs/README.md)). **Do not add `docs/superpowers/`** — that path is a common external skill default and is **gitignored** in this repo to prevent drift.
