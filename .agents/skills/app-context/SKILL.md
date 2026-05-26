---
name: app-context
description: Load this skill at the start of ANY task touching this codebase — adding features, writing tests, reviewing code, planning phases, fixing bugs, or running the QA gate. It defines the FCIS architecture (core/shell/renderer layer rules), the Elysia + Eden Treaty RPC bridge, naming conventions, and the Andromeda Void design system. Without it you risk importing across the wrong layer boundary, using the wrong validation library, or naming files inconsistently.
---

# Project context

## When to load

At the start of **any** project task: features, tests, reviews, planning, bugs,
or quality gate. This skill is the fastest way to avoid FCIS boundary mistakes,
wrong validation, and naming drift.

## Skill locations

- **Project-owned skills** (this file, `app-rpc`, `app-testing`, `app-quality-gate`):
  read from **`<repo>/.agents/skills/<skill-id>/SKILL.md`** (this repository).
- **Project skill ledger**:
  [`assets/guides/SKILLS.md`](../../../assets/guides/SKILLS.md) records which
  skills are project-authored, managed by the Skills CLI as project skills, or
  kept as optional global companions. [`assets/guides/SKILLS.yml`](../../../assets/guides/SKILLS.yml)
  is the structured registry used by `mise run skill validate`,
  `mise run skill sync`, and `mise run skill install`.
- **Electrobun skills** adopted for the project: same folder (e.g.
  `electrobun-best-practices`, `electrobun-rpc`). The
  [`.cursor/electrobun-skill-routing.md`](../../../.cursor/electrobun-skill-routing.md)
  table lists which to open for each topic.
- **Optional global copies**: global companions stay under
  `$HOME/.agents/skills/`; your Cursor install may also mirror skills under
  `$HOME/.config/cursor/skills/`. Prefer the repo path when a skill exists in
  both places.

## Stack (authoritative)

Canonical prose: [`CLAUDE.md`](../../../CLAUDE.md) at repo root. If this skill
and `CLAUDE.md` disagree, **CLAUDE.md wins** — open a PR to fix the skill.

| Layer                    | Role                                                                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Bun**                  | Runtime, package manager, bundler, test runner (`bun test`, `bun run`).                                                               |
| **Electrobun**           | Desktop shell — main process + native webview.                                                                                        |
| **React 19**             | Renderer UI only.                                                                                                                     |
| **Elysia + Eden Treaty** | Typed HTTP RPC between renderer and main (`@rpc/client`).                                                                             |
| **TypeBox**              | **All** validation (transport, core domain, config). **`zod` is not a dependency** — never use `z.*`.                                 |
| **`bun:sqlite`**         | SQLite via typed prepared statements in `src/shell/app/db/`. **No Drizzle ORM**, no drizzle-kit, no drizzle-typebox, no drizzle-seed. |
| **Fishery**              | `factoryFor` from `@testing` for typed test factories.                                                                                |
| **YAML fixtures**        | Under `src/__tests__/fixtures/sample/` only for `ImportService` end-to-end specs.                                                     |

## Feature specs (where to write design docs)

- **Canonical root:** [`assets/docs/specs/<feature-slug>/`](../../../assets/docs/specs/) — `requirements.md`, `design.md`, `tasks.md`, optional `implementation-plan.md`, prototypes. Index: [`assets/docs/specs/README.md`](../../../assets/docs/specs/README.md).
- **Superpowers adaptation:** when a Superpowers skill mentions `docs/superpowers/specs` or `docs/superpowers/plans`, use the `spec-driven-development` skill shape instead and map the output to `assets/docs/specs/<scope>/`. Use `requirements.md`, `design.md`, `tasks.md`, and optional `handoff.md`.
- **`docs/superpowers/`** is **not used** in this project; it is **gitignored** (some external skills default there). Always redirect new specs into `assets/docs/specs/`.
- **Subagent prompts:** include the project path, testing, and validation overrides explicitly because subagents may not inherit this skill's full context.

## FCIS directory layout

```
src/core/           Pure functions. No I/O. No side-effects.
src/shared/         Pure utilities and types. No I/O.
src/shell/app/      App + DB. All I/O except UI (implements `App` in app.ts).
src/shell/main/     Electrobun main — boots app, hosts Elysia RPC (`rpc/server.ts`, `rpc/schemas.ts`).
src/shell/renderer/ React UI. Calls main via Eden Treaty client ONLY.
```

### Forbidden imports (enforced by dependency-cruiser + ast-grep)

| From        | To           | Rule                                             |
| ----------- | ------------ | ------------------------------------------------ |
| `renderer/` | `shell/app/` | **Forbidden** — use `@rpc/client` (Eden Treaty). |
| `core/`     | `shell/`     | **Forbidden** — core stays pure.                 |
| `shared/`   | `shell/`     | **Forbidden** — shared stays I/O-free.           |

Handlers in `shell/app/` call into `core/` and `shared/`; data crosses the
boundary as plain values, not imported I/O.

## RPC contract

- **Single transport**: Elysia app in
  [`src/shell/main/rpc/server.ts`](../../../src/shell/main/rpc/server.ts) with
  TypeBox bodies in
  [`src/shell/main/rpc/schemas.ts`](../../../src/shell/main/rpc/schemas.ts).
- **Renderer**: Eden Treaty client only — never import `App` or repositories
  from the renderer.
- **Preview mirror**: every POST `/api/...` handler added or changed **must**
  have a matching branch in
  [`tools/preview/server.ts`](../../../tools/preview/server.ts) (see
  `CLAUDE.md`).

## Data layer

- SQL DDL and helpers live under
  [`src/shell/app/db/`](../../../src/shell/app/db/) (e.g. `schema.ts`,
  `client.ts`, `*.repository.ts`, `import.service.ts`).
- Use `db.query<RowType, [Params]>(sql)` (typed prepared statements). No ORM
  query builder.

## Naming conventions

Machine-checked: **Biome** (snake_case on every dot-separated segment) +
**ls-lint** (directory ↔ suffix contract — see `.ls-lint.yml`). Full table:
[`assets/guides/CODESTYLE_GUIDE.md`](../../../assets/guides/CODESTYLE_GUIDE.md)
(File Naming).

| Artifact          | Pattern                       | Example                        |
| ----------------- | ----------------------------- | ------------------------------ |
| React component   | `<snake_case>.component.tsx`  | `entry_row.component.tsx`      |
| React page        | `<snake_case>.page.tsx`       | `list.page.tsx`                |
| Hook              | `use_<snake_case>.hook.ts(x)` | `use_list_selection.hook.ts`   |
| Spec (co-located) | same name + `.spec.ts(x)`     | `entry_row.component.spec.tsx` |
| E2E spec          | same name + `.e2e.spec.ts`    | `import.e2e.spec.ts`           |

**Every new file under `src/`** needs a co-located `.spec.ts(x)` (see DoD in
[`assets/guides/DoD.md`](../../../assets/guides/DoD.md)).

## Logging

Use `getLogger(['kb', '<area>', ...])` from `@shared/logging`. Never `console.*` in `src/`.
See `assets/guides/LOGGING_GUIDE.md` + the `app-logging` skill for full reference.

## Design system — Andromeda Void

The renderer follows **Andromeda Void** — a dark-first, glassy, minimal chrome
with electric cyan accents. The implementation uses `theme-*` tokens and
classes; "Andromeda Void" is the visual spec name only. When building UI:

- **Background**: deep charcoal / near-black base (`#0a0a0b` family), **not**
  pure `#000000`.
- **Glass**: translucent panels with `backdrop-blur`, subtle borders
  (`white/5`–`white/10`).
- **Accent**: electric cyan (`#00d4ff` family) — CTAs, focus rings, active
  states. **Sparingly** — never flood the UI with glow.
- **Typography**: **DM Sans** body, **JetBrains Mono** for code/IDs/paths.
- **Motion**: respect `prefers-reduced-motion`; transitions ~150–250ms,
  `ease-out`.

Full tokens and patterns:
[`assets/docs/specs/foundation/design.md`](../../../assets/docs/specs/foundation/design.md)
(Design system section).

## Deep dives (open as needed)

| Topic              | Guide                                                                                               |
| ------------------ | --------------------------------------------------------------------------------------------------- |
| Architecture + RPC | [`assets/docs/specs/foundation/design.md`](../../../assets/docs/specs/foundation/design.md)         |
| FCIS layer rules   | [`assets/guides/FCIS.guide.md`](../../../assets/guides/FCIS.guide.md)                               |
| Naming + SOLID     | [`assets/guides/CODESTYLE_GUIDE.md`](../../../assets/guides/CODESTYLE_GUIDE.md)                     |
| Electrobun wiring  | [`assets/guides/ELECTROBUN.md`](../../../assets/guides/ELECTROBUN.md)                               |
| Testing            | [`assets/guides/TESTING_GUIDE.md`](../../../assets/guides/TESTING_GUIDE.md) + **app-testing** skill |
| Factories          | [`assets/guides/FISHERY_GUIDE.md`](../../../assets/guides/FISHERY_GUIDE.md)                         |
| DoD / gate         | [`assets/guides/DoD.md`](../../../assets/guides/DoD.md) + **app-quality-gate** skill                |

## Gotchas

1. **TypeBox only** — Elysia bodies use `t.*` from Elysia/TypeBox; core/config
   use `Type.Object` + `Value.Check`. No Zod in routes or new code paths.
2. **No Drizzle** — migrations and queries are hand-authored SQL + repositories;
   do not add `@libsql/client` ORM layers or drizzle dependencies.
3. **Renderer isolation** — if you need data, add/adjust an RPC method and call
   it through Eden; never reach into `shell/app/`.
4. **Preview drift** — forgetting `tools/preview/server.ts` breaks local preview
   and CI assumptions; mirror every new `/api/*` route.
5. **`bun test` vs Playwright** — `bun test` only discovers tests under `src/`
   (`bunfig.toml` `[test] root = "src"`), so Playwright files in `e2e/` are not
   run by the gate. Use `mise run e2e:preview` (or `bun run e2e:preview:install`
   once for Chromium) when validating preview UI flows; specs may `test.skip`
   when the preview DB is empty or `PLAYWRIGHT` is unset.

## Companion skills

| Skill                | When                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------ |
| **app-rpc**          | Touching `rpc/server.ts`, `rpc/schemas.ts`, Eden client, or preview server routes.         |
| **app-testing**      | Writing or changing any spec.                                                              |
| **app-quality-gate** | Before declaring work done or committing.                                                  |
| **electrobun-***     | Per [`.cursor/electrobun-skill-routing.md`](../../../.cursor/electrobun-skill-routing.md). |

Optional companions stay subordinate to project-owned skills and guides:

<!-- skills:optional-companions:start -->
| Skill                              | When                                                                                   |
| ---------------------------------- | -------------------------------------------------------------------------------------- |
| **systematic-debugging**           | Investigating failing tests, gate failures, regressions, or unexpected behavior.       |
| **elysia**                         | Checking Elysia route mechanics after loading app-rpc.                                 |
| **receiving-code-review**          | Applying review feedback, especially when feedback is ambiguous or broad.              |
| **requesting-code-review**         | Preparing a review handoff, PR, or larger completed change for scrutiny.               |
| **mise-tasks**                     | Editing mise.toml, task dependencies, or multi-step project workflows.                 |
| **mise-expert**                    | Editing mise tool versions or environment setup.                                       |
| **ast-grep**                       | Authoring or debugging structural search and rewrite rules.                            |
| **knip**                           | Resolving unused exports, files, dependencies, or knip configuration findings.         |
| **jscpd**                          | Investigating duplication reports and planning small shared abstractions.              |
| **dry-principle**                  | Deciding whether duplication warrants extraction.                                      |
| **solid-principles**               | Reviewing class or module design.                                                      |
| **react:components**               | Translating design artifacts into renderer components, adapted to project conventions. |
| **stitch-design**                  | Design intake or prototypes, only under the prototype gate.                            |
| **using-git-worktrees**            | Isolated parallel work, only when requested or approved.                               |
| **verification-before-completion** | Final reminder only; app-quality-gate is the executable authority.                     |
<!-- skills:optional-companions:end -->

---

*Synced with `CLAUDE.md` (Bun, Electrobun, React 19, Elysia + Eden, TypeBox,
`bun:sqlite`, Fishery, FCIS layout, Andromeda Void).*
