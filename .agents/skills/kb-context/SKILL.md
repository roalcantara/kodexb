---
name: kb-context
description: >
  Load this skill at the start of ANY task touching the kb codebase — adding
  features, writing tests, reviewing code, planning phases, fixing bugs, or
  running the QA gate. It defines the FCIS architecture (core/shell/renderer
  layer rules), the Elysia + Eden Treaty RPC bridge, naming conventions, and
  the Andromeda Void design system. Without it you risk importing across the
  wrong layer boundary, using the wrong validation library, or naming files
  inconsistently. When in doubt, load it — it's cheap and prevents costly
  mistakes.
---

# kb Project Context

## What kb Is

A macOS desktop app (Electrobun) that lets developers browse, search, and
manage personal knowledge entries (bookmarks, commands, cheat-sheets, tasks).
Data is stored in a local SQLite database fed by YAML source files.

Runtime: **Bun**. Framework: **Electrobun** (Chromium view + native shell).
UI: **React 19** (renderer process). RPC bridge: **Elysia + Eden Treaty**.

---

## Architecture — FCIS (Functional Core, Imperative Shell)

```
src/
  core/         Pure domain logic — zero I/O, zero side-effects
  shared/       Types and utilities shared across layers
  shell/
    app/        Application service — orchestrates DB + file I/O
      db/       Drizzle + SQLite, import service, schema
    main/       Electrobun main process — boots app, registers RPC server
    renderer/   React UI — pages, components, hooks
tools/          Dev tools (preview server, etc.)
```

### Layer Rules (enforce with dependency-cruiser)

| From              | May depend on          | Must NOT depend on      |
|-------------------|------------------------|-------------------------|
| `src/core/`       | nothing outside itself | shell, renderer, tools  |
| `src/shell/app/`  | `src/core/`, `src/shared/` | renderer, main     |
| `src/shell/main/` | `src/shell/app/`, `src/shared/` | renderer      |
| `src/shell/renderer/` | `src/shared/`      | app, main, core (direct)|

`renderer` talks to `app` **exclusively** through the Elysia RPC bridge.
It never imports from `src/shell/app/` directly.

---

## RPC Bridge — Elysia + Eden Treaty

The Elysia `App` type is the single source of truth for the RPC contract.
Eden Treaty auto-generates a fully type-safe client — no manual schema file.

```
src/shell/main/rpc/
  server.ts        Elysia app definition (all routes)
  client.ts        Eden Treaty client (re-exported for renderer)

src/shell/app/app.ts   AppService — injected into Elysia routes
```

See skill `kb-rpc` for patterns and gotchas.

---

## Data Layer — Drizzle + SQLite

```
src/shell/app/db/
  schema.ts       Drizzle table definitions
  index.ts        DB connection (bun:sqlite)
  import.service.ts  YAML → DB import pipeline
  seed.ts         drizzle-seed fixtures (test + dev)
```

Schema validation at the transport layer uses **drizzle-typebox**
(`createSelectSchema`, `createInsertSchema`) so shapes stay DRY.

---

## Naming Conventions

| Artifact           | Convention                          | Example                          |
|--------------------|-------------------------------------|----------------------------------|
| React components   | `PascalCase.component.tsx`          | `EntryRow.component.tsx`         |
| React pages        | `kebab-case.page.tsx`               | `list.page.tsx`                  |
| React hooks        | `use-kebab-case.hook.ts`            | `use-list-selection.hook.ts`     |
| Elysia route files | `kebab-case.routes.ts`              | `entries.routes.ts`              |
| DB schema file     | `schema.ts` (single file)           | —                                |
| Test files         | same name + `.spec.ts(x)`           | `entry-row.component.spec.tsx`   |
| Skills             | `kb-<topic>/SKILL.md`               | `kb-rpc/SKILL.md`                |

All files: lowercase kebab-case. No `index.ts` barrel re-exports inside `src/core/`.

---

## Design System — Andromeda Void

| Token          | Value     | Usage                        |
|----------------|-----------|------------------------------|
| bg             | `#0b0e14` | App background               |
| surface        | `#121721` | Cards, panels                |
| accent-command | `#5ecfbe` | Commands, primary actions    |
| accent-cheat   | `#a855f7` | Cheat-sheets                 |
| accent-task    | `#ffae57` | Tasks                        |
| accent-bookmark| `#3399ff` | Bookmarks                    |
| radius         | `6px`     | All interactive controls     |
| shadow         | none      | Depth = tonal only           |

System font stack. No web fonts.

---

## Gotchas

- **Never** import `src/shell/app/` from renderer — use Eden Treaty client only.
- **Never** add `node:` builtins in `src/core/` — pure functions only.
- Elysia is Bun-only; do not use Express/Fastify/Hono as alternatives.
- `bun:sqlite` for the DB connection — not `better-sqlite3`.
- Drizzle migrations live in `drizzle/` at project root, not `src/`.
- The preview server (`tools/preview/server.ts`) must mirror every Elysia route — keep it in sync when adding endpoints.
