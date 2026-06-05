---
title: Code Style Guide
description: Coding patterns, 12-Factor, and SOLID principles for kodexb
---
<!-- markdownlint-disable-file -->

# Coding Style Guide

Cursor rule (summary): `.cursor/rules/codestyle.mdc`

## Core Principles

- **Prefer simple solutions** — Avoid unnecessary abstraction
- **DRY** — Check for existing similar code before adding new logic. Never repeat code; abstract into a shared function or module.
- **Minimal changes** — Only make requested changes or well-understood related changes
- **Exhaust first** — When fixing a bug, exhaust existing implementation options before introducing new patterns or technologies. If you do introduce a new one, remove the old implementation to avoid duplicate logic.
- **Clean and organized** — Keep the codebase easy to navigate and reason about

## Non-Negotiable Rules

- **No magic numbers or strings** — Extract to named constants. Paths, limits, regex patterns, and any literal that carries meaning must have a single source of truth.
- **Abstract repeated logic** — If you copy-paste, stop. Extract a function or reuse an existing one.
- **Open for extension, closed for modification** — Add new formatters, commands, or modules instead of branching inside existing ones. Prefer registries and polymorphism over switch/if chains.

## Type Definitions

- **Inline simple single-use types** — If a type is used only once and has ≤3 properties, prefer inline definition over extracted type alias. Extraction adds indirection without benefit.
- **Extract reusable types** — If a type is used in multiple places, extract it to avoid duplication.
- **Extract complex types** — If a type has many properties or complex validation (TypeBox refinements, unions, transforms), extraction improves readability even if used once.
- **Extract semantic types** — If the type name adds significant meaning (e.g., `EntryTypeName`, `ThemeColorName`), extraction is justified.

```typescript
import { type Static, Type } from '@sinclair/typebox'

// ❌ Avoid: single-use type with few properties
type FetchConfig = {
  timeout_ms: number
  user_agent?: string
}
export type Config = {
  fetch: FetchConfig  // indirection without benefit
}

// ✅ Prefer: single-use shape — colocate TypeBox schema and infer the type
const fetchSchema = Type.Object({
  timeout_ms: Type.Integer({ minimum: 1 }),
  user_agent: Type.Optional(Type.String()),
})
export type Config = {
  fetch: Static<typeof fetchSchema>
}

// ✅ Keep extracted: reused or semantically meaningful
type EntryTypeName = 'Bookmark' | 'Command' | 'Cheat' | 'Task'
type ThemeElements = Record<EntryTypeName, string>  // reuses EntryTypeName
type ThemeSymbols = Record<EntryTypeName, string>   // reuses EntryTypeName
```

## 12-Factor (adapted for CLI)

Inspired by [The Twelve-Factor App](https://12factor.net). Applied where relevant to a CLI/TUI app:

- **Config** — Store config in environment, files, or flags. Never hardcode paths or secrets.
- **Backing services** — Treat SQLite as an attachable resource (paths via config, swappable in tests).
- **Build/run** — Keep build and run stages separate. No runtime compilation.
- **Dev/prod parity** — Same code path everywhere. Use in-memory SQLite or fixtures in tests.
- **Logs** — Use stdout/stderr. No ad-hoc log files.
- **Admin processes** — One-off tasks (import, validate) run as commands, not background services.

## SOLID (adapted)

- **S — Single Responsibility** — Each function, module, and file has one reason to change.
- **O — Open/Closed** — Extend via new formatters, commands, or modules; avoid modifying existing ones for new behavior.
- **D — Dependency Inversion** — Depend on abstractions (e.g. `AppDeps`). Inject dependencies; don't import concrete I/O from domain code.

## File Naming

### Pattern: `<name>.<suffix>.ts`

Every source file carries exactly one suffix that declares its role. Biome enforces snake_case on
each dot-separated segment (`bun run lint:biome`). ls-lint enforces which suffixes are valid per
directory (`bun run lint:ls`). Together they make the suffix table below **machine-checked** — not
just documented.

### Canonical Suffix Vocabulary

All suffixes are **singular**. Plurals are only allowed for _aggregate_ modules that re-export a
collection of the same kind (e.g. `rpc.host.schemas.ts` exports many schemas).

#### Domain / service layer (`.ts`)

| Suffix           | Purpose                                           | Example                     |
| ---------------- | ------------------------------------------------- | --------------------------- |
| `.service.ts`    | Business logic orchestration                      | `app.service.ts`            |
| `.repository.ts` | Data access (queries, writes)                     | `entry.repository.ts`       |
| `.schema.ts`     | TypeBox schema + inferred input type              | `config.schema.ts`          |
| `.schemas.ts`    | Aggregate: re-exports multiple schemas            | `rpc.host.schemas.ts`       |
| `.loader.ts`     | File / resource loading                           | `config.loader.ts`          |
| `.parser.ts`     | Parse input → structured result, no side-effects  | `source_document.parser.ts` |
| `.assembler.ts`  | Combine multiple parsed parts into one structure  | `doc.assembler.ts`          |
| `.guard.ts`      | Type guard / runtime predicate                    | `entry.guard.ts`            |
| `.factory.ts`    | Test or production object creation                | `entry.factory.ts`          |
| `.adapter.ts`    | Translate between two interfaces                  | `logtape.adapter.ts`        |
| `.state.ts`      | Persisted or in-memory state management           | `window.state.ts`           |
| `.client.ts`     | Client wrapper around an external API / process   | `rpc.client.ts`             |
| `.host.ts`       | Server / host side of a protocol                  | `rpc.host.ts`               |
| `.logger.ts`     | Logger implementation                             | `console.logger.ts`         |
| `.util.ts`       | Pure stateless helper functions                   | `crc32.util.ts`             |
| `.const.ts`      | Named constants (singular — one module of consts) | `entry.const.ts`            |
| `.types.ts`      | Type-only module (no runtime code)                | `entry.types.ts`            |
| `.builder.ts`    | Fluent or step-wise object builder                | `factories.builder.ts`      |
| `.helper.ts`     | Test-only helper (not production code)            | `path.helper.ts`            |
| `.seed.ts`       | DB / fixture seeding                              | `testing.seed.ts`           |

#### Renderer layer (`.tsx`)

| Suffix                   | Purpose                                         | Example                              |
| ------------------------ | ----------------------------------------------- | ------------------------------------ |
| `.page.tsx`              | Top-level routable page                         | `list.page.tsx`, `settings.page.tsx` |
| `.component.tsx`         | Reusable UI component                           | `entry_row.component.tsx`            |
| `.hook.ts` / `.hook.tsx` | Custom React hook (file must start with `use_`) | `use_list_selection.hook.ts`         |

#### Renderer styles (`.css`)

Tailwind v4 partials live under `src/shell/renderer/styles/`. See
[`STYLING_GUIDE.md`](STYLING_GUIDE.md) for the full pipeline.

| Location             | Basename pattern                | Example                         |
| -------------------- | ------------------------------- | ------------------------------- |
| `styles/`            | `app`, `theme`, optional `list` | `theme.css`                     |
| `styles/components/` | snake_case surface name         | `entry_row.css`, `list_row.css` |

Generated output (`styles/generated/app.css`) is gitignored; run `mise run app styles` after CSS edits.

#### Test files

| Suffix         | Purpose                 | Placement                        |
| -------------- | ----------------------- | -------------------------------- |
| `.spec.ts`     | Unit / integration test | Co-located with source           |
| `.spec.tsx`    | Component test          | Co-located with source           |
| `.e2e.spec.ts` | End-to-end test         | Co-located with source or `e2e/` |

For role-suffixed source files, place the test marker after the role suffix:
`use_list_selection.hook.spec.tsx`, `task_state.util.spec.ts`, and
`requests.spec.ts`. This keeps the source role visible while still marking the
file as a test.

#### Tools directory (`tools/`)

Repo tooling is TypeScript-first. Every `.ts` file under `tools/` (except
`tools/scripts/` shell helpers) uses the **`.script.ts`** artifact suffix — mise
entrypoints, domain libraries, hooks, and preview servers alike. Co-located tests
use **`.script.spec.ts`**. Type-only modules keep **`.types.ts`**.

| Pattern           | Example                                                        |
| ----------------- | -------------------------------------------------------------- |
| `.script.ts`      | `tools/catalog/catalog.script.ts`, `tools/mise/test.script.ts` |
| `.script.spec.ts` | `tools/catalog/tag.script.spec.ts`                             |
| `.types.ts`       | `tools/skill/skill_registry.types.ts`                          |

ast-grep rules live under `tools/rules/` as **`<id>.rule.yml`**. Enforced by
ast-grep (`tools-must-use-script-suffix`, `tools-rules-must-use-rule-suffix`) and
ls-lint (see `.ls-lint.yml`).

### ❌ Banned / deprecated suffixes

These were found in the codebase and are being migrated out. Do not use them in new files.

| Banned suffix                         | Use instead      | Migration status                   |
| ------------------------------------- | ---------------- | ---------------------------------- |
| `.consts.ts`                          | `.const.ts`      | Cursor task: `naming-alignment.md` |
| `.type.ts`                            | `.types.ts`      | Cursor task: `naming-alignment.md` |
| `.view.tsx`                           | `.component.tsx` | Cursor task: `naming-alignment.md` |
| `.lib.ts`, bare `.ts` under `tools/`  | `.script.ts`     | Enforced by ast-grep + ls-lint     |
| `tools/rules/*.yml` (without `.rule`) | `*.rule.yml`     | Enforced by ast-grep + ls-lint     |

### Exceptions (no suffix)

| File       | Purpose        | Rationale            |
| ---------- | -------------- | -------------------- |
| `index.ts` | Barrel exports | Universal convention |
| `main.ts`  | Entrypoints    | Universal convention |
| `app.tsx`  | Renderer root  | Universal convention |

### Directory ↔ Suffix contract

The folder name declares what kind of files live there. ls-lint enforces this (see `.ls-lint.yml`):

| Directory               | Allowed suffixes                                 |
| ----------------------- | ------------------------------------------------ |
| `components/<feature>/` | `.component.tsx`, `.spec.tsx`                    |
| `hooks/<feature>/`      | `.hook.ts`, `.hook.tsx`, `.spec.ts`, `.spec.tsx` |
| `pages/<feature>/`      | `.page.tsx`, `.types.ts`, `.spec.tsx`            |
| `utils/<feature>/`      | `.util.ts`, `.util.tsx`, `.spec.ts`, `.spec.tsx` |
| `constants/`            | `.const.ts`, `.spec.ts`                          |
| `schemas/`              | `.schema.ts`, `.schemas.ts`, `.spec.ts`          |
| `guards/`               | `.guard.ts`, `.spec.ts`                          |
| `parsers/`              | `.parser.ts`, `.spec.ts`                         |
| `factories/`            | `.factory.ts`, `.spec.ts`                        |
| `types/`                | `.types.ts`                                      |
| `services/<name>/`      | `.service.ts`, `.spec.ts`                        |

Every directory except `index.ts` entries must satisfy this contract. A file in the wrong folder
is a lint error, not a review comment.

### Why This Pattern?

1. **Zero ambiguity** — Suffix = role. You never wonder what a file does.
2. **Machine-checked** — Two tools (Biome + ls-lint) enforce it without human review.
3. **Discoverability** — `find src -name "*.service.ts"` gives you every service.
4. **Rails-style** — Convention over configuration: know the folder, know the suffix, done.

## Identifier Naming (product- and format-agnostic)

Identifiers must describe **what role something plays**, not which product owns the
codebase or which on-disk format happens to back it today. The repo directory and
some external strings (bundle id, default config path, log category) still carry
the historical `kb` codename, but **code-level names** stay neutral.

### What stays neutral

| Surface                   | Rule                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------ |
| Files / folders           | No `kb_*`, `kb-*`, `*_yaml*`, `*Yaml*` segments. Name after the role.                |
| TypeScript symbols        | No `Kb*`, `createKb*`, `*Yaml` identifiers. Use `Shell*`, `Webview*`, `*Source*`.    |
| SQL aliases / CTE names   | No `kb_*` aliases. Name after the column or join role (`tag_row`, not `kb_tag_row`). |
| Elysia plugin `name`      | No `kb-*` plugin names. Use the contract role (`rpc-error`).                         |
| CSS custom properties     | `--theme-<role>` (e.g. `--theme-bg`, `--theme-text-muted`).                          |
| CSS class names           | `.theme-<object>[-<part>][--<modifier>]`, e.g. `.theme-entry-row--selected`.         |
| Agent skill IDs / folders | `app-<role>` (`app-context`, `app-rpc`, `app-testing`, `app-quality-gate`).          |
| Log lines / UI copy       | Format-agnostic wording ("source file", not "YAML file") when the format may change. |

### What stays as-is (strings, not identifiers)

Cheap-to-change literals can keep `kb` / `yaml`. They are not in scope for this rule:

- Bundle / distribution identifiers: `electrobun.config.ts` `app.name: 'kb'`,
  `identifier: 'sh.blackboard.kb'`, artifact names like `kb-${version}-*.dmg`.
- Default config path `~/.config/kb/config.yaml` (a runtime value).
- Logtape category `['kb']` (a runtime namespace string).
- Test / fixture filenames ending in `.yaml` / `.yml` when the test is about that
  file on disk.
- Glob literals `**/*.{yaml,yml}` in import services (extensions stay in the
  constant value, not in the API name).
- `package.json` `"name": "kb"` and the repo directory name.

### Canonical lexicon

| Domain            | Old (product / format coupled)                                | New (role-based, neutral)                                            |
| ----------------- | ------------------------------------------------------------- | -------------------------------------------------------------------- |
| Main process      | `kb_shell_hooks.util.ts`, `createKbShellHooks`                | `shell_hooks.util.ts`, `createShellHooks`                            |
| Main process      | `createKbLateEmit`                                            | `createDeferredSyncEmit`                                             |
| RPC bridge        | `createKbWebviewRpc`, `KbWebviewRpc`                          | `createWebviewRpc`, `WebviewRpc`                                     |
| RPC schema        | `KbDesktopRpcSchema`, `kb_rpc_schema.ts`                      | `DesktopRpcSchema`, `desktop_rpc_schema.ts`                          |
| Logging           | `KbLogVerbosity`, `kb_log_verbosity.ts`                       | `LogVerbosity`, `log_verbosity.ts`                                   |
| Logging           | `parseKbLogVerbosity`, `isKbLogVerbosity`, `kbLowestLevel`    | `parseLogVerbosity`, `isLogVerbosity`, `lowestLevelForVerbosity`     |
| Elysia plugin     | `name: 'kb-rpc-error'`                                        | `name: 'rpc-error'`                                                  |
| SQL alias         | `kb_tag_row`                                                  | `tag_row`                                                            |
| Source write-back | `app_task_yaml.util.ts`, `writeTaskToYaml`, `taskToYamlShape` | `app_task_source.util.ts`, `writeTaskToSource`, `taskToSourceRecord` |
| CSS tokens        | `--kb-bg`, `--kb-color-task`                                  | `--theme-bg`, `--theme-entry-color-task`                             |
| CSS classes       | `.kb-entryRow`, `.kb-pt-filter-option`                        | `.theme-entry-row`, `.theme-compact-filter-option`                   |
| Assets            | `assets/icons/kb-logo.*`                                      | `assets/icons/app-logo.*`                                            |
| Skills            | `kb-context`, `kb-rpc`, `kb-testing`, `kb-quality-gate`       | `app-context`, `app-rpc`, `app-testing`, `app-quality-gate`          |

### CSS naming: two layers, kebab-case

1. **Tokens** — CSS custom properties only, named after the **role**:
   `--theme-bg`, `--theme-surface`, `--theme-border`, `--theme-text`,
   `--theme-text-muted`, `--theme-accent`, `--theme-row-hover`,
   `--theme-row-selected`, `--theme-danger`, `--theme-warn`,
   `--theme-entry-color-<type>`.
2. **Classes** — `theme-` prefix + **object** + optional element / modifier in
   kebab-case BEM:
   `.theme-list-page`, `.theme-toolbar`, `.theme-entry-row`,
   `.theme-entry-row--selected`, `.theme-detail-panel`,
   `.theme-compact-filter-option`. Decode opaque legacy segments such as `pt`
   to explicit object names (e.g. `kb-pt-filter-option` →
   `theme-compact-filter-option`) when renaming.

The visual spec name ("Andromeda Void") may appear in prose comments; **only**
identifiers carry the `theme-*` prefix.

## Folder Naming Conventions

nouns, not verbs (widely used pattern)

Although there is no single ISO standard, but the dominant convention in industry and books is to name packages / modules / feature folders after nouns (the thing or concern), not imperative verbs:

- **Domain-Driven Design** — bounded contexts and modules are named as things (Billing, Inventory, Shipping), not validate or process.
- **Package by feature** — (common in Angular, React, backend services) — folders are feature nouns (auth, profile, checkout).
- **Rails / Django layers** — use plural nouns (models, controllers, views)—again nominal, not doStuff/.
- **Practical rule for topic dirs** - use domain nouns or clear nominalizations:

  | Avoid `(verb-y)` | Rationale                                  | Prefer `(noun / nominal)` |
  | ---------------- | ------------------------------------------ | ------------------------- |
  | validate/        | noun; pairs cleanly with parse/            | validation/               |
  | parse/           | noun; pairs cleanly with validation/       | parsing/                  |
  | argv/            | Matches Bun.argv / parseArgv; Unix-honest. | parsing/                  |
  | run/             | ambiguous                                  | dispatch/ or execution/   |
  | compose/         | often read as verb                         | factories/                |

> **NOTE:** Files inside still use verb phrases in function names (validateCommand, parseArgv)
> and **.service.ts / .factory.ts** suffixes—that is correct;
> the folder is the area, the file is the artefact type.

## Shell layer architecture

`src/shell/` is split into three layers, each mapping to a distinct Electrobun process
and responsibility. **Nothing crosses these boundaries without going through typed RPC.**

```
src/shell/
  app/       ← Business logic layer (runs in main process, no UI)
  main/      ← Process bootstrap layer (window, RPC host, OS integration)
  renderer/  ← UI layer (runs in WebView/Chromium, React)
```

### `src/shell/app/` — Business logic layer

*Rails analogy: `app/models/` + `app/services/`*

Owns all business logic, data access, and config. Has no knowledge of UI or window management.
Accessed exclusively through the RPC interface.

| Sub-folder       | Purpose                                                             |
| ---------------- | ------------------------------------------------------------------- |
| `config/`        | Config loading, schema, defaults                                    |
| `db/`            | SQLite client (bun:sqlite), hand-authored schema, entry repository  |
| `services/`      | Operation services (e.g. import, sync) — one sub-folder per service |
| `lib/`           | Internal utilities that support the above (not exported publicly)   |
| `app.service.ts` | Root orchestrator; the single entry point consumed by `main/`       |

### `src/shell/main/` — Process bootstrap layer

*Rails analogy: `config/initializers/` + `config/routes.rb`*

Owns Electrobun lifecycle: creates the window, starts the RPC host, handles OS dialogs and
window state. Has no business logic — delegates everything to `AppService`.

Grouped into concern sub-folders — the folder provides context so prefixes drop from filenames:

| File pattern      | Purpose                                                         |
| ----------------- | --------------------------------------------------------------- |
| `main.ts`         | Entry point — initialises window, loads config, starts RPC host |
| `*.helper.ts`     | Process-level helpers (e.g. error dialogs)                      |
| `rpc/host.ts`     | RPC host definition (binds the typed schema to the process)     |
| `rpc/requests.ts` | RPC handler implementations — thin delegation to `AppService`   |
| `rpc/schemas.ts`  | Aggregate TypeBox schemas for validating all RPC payloads       |
| `window/state.ts` | Persists and restores window bounds between sessions            |

### `src/shell/renderer/` — UI layer

*Rails analogy: `app/views/` + `app/controllers/` combined (each page = controller + view)*

Owns all React UI. Communicates with `main/` exclusively via the typed RPC client (`rpc.client.ts`).
Never imports from `shell/app/` or `shell/main/` directly.

```
renderer/
  pages/          ← one file per screen; coordinates data + renders structure
  components/
    list/         ← components owned by list.page.tsx
    detail/       ← components owned by detail.page.tsx
    shared/       ← components used by two or more pages
  hooks/
    list/         ← hooks owned by list.page.tsx
    settings/     ← hooks owned by settings.page.tsx
    shared/       ← hooks used by two or more pages
  utils/
    list/         ← pure utils for list feature
    shared/       ← pure utils used by two or more features
  constants/      ← named constants
  types/          ← renderer-level type-only modules
  styles/         ← CSS files
```

**Feature sub-folder rule (applies everywhere):** every top-level renderer directory is
sub-foldered by the same feature names. This is the Rails `views/<resource>/` principle
applied to all renderer concerns — not just views.

```
pages/list/        components/list/        hooks/list/        utils/list/
pages/detail/      components/detail/      hooks/detail/      utils/detail/
pages/settings/    components/settings/    hooks/settings/    utils/shared/
                   components/shared/      hooks/shared/
```

A file belongs to the feature sub-folder of the page that owns it. If it is used by
two or more pages, it moves to `shared/`. New pages always get a new sub-folder — never
a flat file at the `pages/` root.

**`pages/<feature>/` may contain:**
- The page component itself (`.page.tsx`)
- Its spec (`.page.spec.tsx`)
- Page-local types (`.types.ts`) — only if the type is used nowhere else

**`pages/` ≠ passive templates.** Pages coordinate data (via hooks + RPC) and render the
top-level layout. All sub-rendering lives in `components/<feature>/`; all stateful logic
lives in `hooks/<feature>/`. A page file should stay under ~80 lines.

### `src/__tests__/` — Global test infrastructure

Conventional Node/Jest `__tests__` folder. Contains fixtures, factories, and test helpers
consumed by specs across all layers via the `@testing` path alias.

| Sub-folder      | Purpose                                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------------------------ |
| `fixtures/`     | YAML fixture files and invalid config samples                                                                |
| `factories/`    | Test data builders (`factories.builder.ts`)                                                                  |
| `helpers/`      | Shared test utilities (`testing.factory.ts`, `testing.seed.ts`, `testing.tmp.ts`, `testing.react.helper.ts`) |
| `paths.util.ts` | Absolute paths to fixture directories; consumed by the barrel                                                |
| `index.ts`      | Barrel — re-exports everything as the `@testing` alias                                                       |

Naming inside `__tests__/` follows the same suffix rules as the rest of the project.
The `testing.` prefix is a convention for files that only make sense in a test context.

## Structure

- **File size** — Refactor when files exceed 200-300 lines.
- **Scripts** — Avoid one-off scripts in files. Prefer `mise.toml` tasks.
- **Module ownership** — Serialization of type T lives in T's module (see `.cursor/rules/module-ownership.mdc` and specs under `assets/docs/specs/` when present).

## Asset File Conventions

### Glossary

| Term          | Definition                                                                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **spec**      | Written `.md` document describing UI layout, component anatomy, and interaction model. The implementor's source of truth. |
| **reference** | Read-only screenshot from an existing product (or design tool output) used as a visual benchmark. Never modified.         |
| **prototype** | Numbered iteration screenshot of *kb's own UI*, generated during design phases. Sequence-ordered.                         |

### `assets/wireframe/` structure

```
assets/wireframe/
  specs/       ← written UI specifications (e.g. desktop.md)
  references/  ← ALL external visual refs: powertoys, raycast, stitch, gemini
  prototypes/  ← numbered kb iteration PNGs
```

**Rule: one folder per role.** External visual artifacts — regardless of source — live in `references/`. The `<source>.` filename prefix communicates provenance without needing sub-folders.

### Naming conventions (enforced by `bun run lint:ls`)

| Folder                  | Pattern                        | Regex                                           | Example                     |
| ----------------------- | ------------------------------ | ----------------------------------------------- | --------------------------- |
| `wireframe/specs/`      | `<description>.md`             | `^[a-z][a-z0-9_]*$`                             | `desktop.md`                |
| `wireframe/references/` | `<source>.<description>.<ext>` | `[a-z][a-z0-9]+\.[a-z0-9][a-z0-9_]*\.(png\|md)` | `powertoys.list_detail.png` |
| `wireframe/references/` | exception                      | `README\.md`                                    | `README.md`                 |
| `wireframe/prototypes/` | `NN_<description>.<ext>`       | `^[0-9]{2}_[a-z][a-z0-9_]*$`                    | `01_list_initial.png`       |

- `source` = lowercase alphanum tool/product name (`powertoys`, `raycast`, `stitch`, `gemini`)
- `description` = lowercase snake_case, brief
- `NN` = zero-padded 2-digit sequence number

Note: `ls-lint` validates the basename segment for `.md` and `.png` files here,
so avoid additional dot segments like `desktop.v2.md` or `01_list.bad.png`. Use
snake_case instead.

### Automation

Naming is enforced by [`@ls-lint/ls-lint`](https://ls-lint.org) via `.ls-lint.yml` at the repo root.
Run with `bun run lint:ls`. Included in the `bun run lint` compound check.

To add a new folder under `assets/wireframe/`, add a matching entry in `.ls-lint.yml` before committing.

## Logging

- Use `getLogger(['kb', '<area>', ...])` from `@shared/logging`.
- Categories follow `['kb', '<area>', '<sub-area>']` convention.
- Never use `console.*` in `src/`.
- DB queries: use `repositoryStmts(db, 'Noun', { ...sql })`.
- RPC logging: handled automatically by `rpcCommonPlugins`.
- See `assets/guides/LOGGING_GUIDE.md` for the canonical reference.

## Behavior

- **Mocking** — Only in tests. Never mock or stub data in dev/prod code.
- **Env files** — Never overwrite `.env` without explicit confirmation.
- **Test data** — Fixtures and in-memory DB for tests; no fake data in app code paths.
