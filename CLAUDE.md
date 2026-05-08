<!-- markdownlint-disable-file -->
# kb — Claude Code instructions

## Stack

Bun runtime. Electrobun desktop framework (macOS). React 19 renderer.
Elysia + Eden Treaty for RPC. TypeBox for transport validation. Zod for core domain only.
Drizzle ORM + bun:sqlite. drizzle-seed for test fixtures.

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

- **Validation at transport**: use `t.*` (TypeBox / Elysia) in route files. Never `z.*` (Zod).
- **Validation in core/import**: use Zod for YAML parsing and domain invariants only.
- **Test fixtures**: use `drizzle-seed`. Never `fishery`.
- **Logging**: use `createLogger()` from `@shared/logging`. Never `console.*` in `src/`.
- **Every new Elysia route** must also appear in `tools/preview/server.ts`.
- **Every new file** in `src/` needs a co-located `.spec.ts(x)`.
- **Exports**: unused exports are a knip error — delete or use before committing.

## Naming conventions

| Artifact             | Pattern                        | Example                       |
|----------------------|--------------------------------|-------------------------------|
| React components     | `PascalCase.component.tsx`     | `EntryRow.component.tsx`      |
| React pages          | `kebab-case.page.tsx`          | `list.page.tsx`               |
| React hooks          | `use-kebab-case.hook.ts`       | `use-list-selection.hook.ts`  |
| Elysia route files   | `kebab-case.routes.ts`         | `entries.routes.ts`           |
| Test files           | same name + `.spec.ts(x)`      | `entry-row.component.spec.tsx`|

## Skills to load

Load these at the start of any kb task:

- `kb-context` — always (architecture + naming + design system)
- `kb-rpc` — when touching Elysia routes or the Eden Treaty client
- `kb-testing` — when writing or modifying tests
- `kb-quality-gate` — before marking anything done

Skills live at `.agents/skills/`. Global Electrobun skills at `~/.agents/skills/`.

## Reference docs

- `assets/docs/design.md` — architecture decisions, layer rules, RPC contract
- `assets/docs/requirements.md` — EARS specs V1-1 through V1-8
- `assets/docs/roadmap.md` — phase sequence, skills per phase, development loop
