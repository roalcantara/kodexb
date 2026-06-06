---
name: app-logging
description: >
  Use when writing or modifying ANY logging code — adding log lines,
  changing categories, configuring sinks, or debugging verbosity.
  Triggers on: getLogger, configureMainLogging, configureRendererLogging,
  repositoryStmts, LOG_LEVEL, log level, verbosity, structured logging.
---

# App Logging

## Overview

kb uses [LogTape](https://logtape.org) for structured debug logging with a
`LOG_LEVEL` environment-variable dial. All `src/` code uses
`getLogger(['kb', '<area>', ...])` from `@shared/logging`. The main process
configures sinks and context storage once at boot; the renderer configures
independently. RPC requests are correlated by `requestId`; SQL queries are
timed and logged only at `debug`+.

## When to load

- Adding or changing any logging line in `src/`
- Changing logger categories
- Configuring log sinks or verbosity
- Debugging log output or verbosity behavior
- Adding RPC/SQL instrumentation
- Writing tests that assert on log output

## Quick reference

| API                          | Purpose                                        |
| ---------------------------- | ---------------------------------------------- |
| `getLogger(['kb', ...])`     | Create a logger for a category                 |
| `withContext({ ... }, fn)`   | Bind context fields to downstream log records  |
| `configureMainLogging()`     | One-shot main process sink + level config      |
| `configureRendererLogging()` | One-shot renderer console sink config          |
| `repositoryStmts(db, n, {})` | Instrumented prepared statement bag            |
| `rpcCommonPlugins`           | Elysia plugin bundle (error contract + logger) |
| `LOG_LEVEL`                  | Env var dial: default/verbose/debug/trace      |

## Categories

| Category                      | Owner                                |
| ----------------------------- | ------------------------------------ |
| `['kb', 'main']`              | Main process boot                    |
| `['kb', 'app']`               | AppService                           |
| `['kb', 'app', 'sync']`       | Import/sync pipeline                 |
| `['kb', 'app', 'task']`       | Task source util                     |
| `['kb', 'rpc']`               | RPC lifecycle (automatic via plugin) |
| `['kb', 'sqlite']`            | DB queries (automatic via wrapper)   |
| `['kb', 'ui']`                | Renderer top-level                   |
| `['kb', 'ui', 'list-page']`   | List page                            |
| `['kb', 'ui', 'detail-page']` | Detail page                          |
| `['kb', 'ui', 'rpc-client']`  | Eden Treaty client                   |
| `['kb', 'ui', 'sync']`        | Renderer sync handlers               |

Categories are `string[]`. The first two elements are always `['kb', '<area>']`.

## Gotchas

1. **Never `console.*` in `src/`.** Use `getLogger(...)` from `@shared/logging`.
   The sole exception is the renderer's `getConsoleSink()` inside
   `renderer.config.ts`.
2. **Don't call `configureSync` in components or libraries.** Configuration
   is one-shot at entry points only (`main.ts`, `app.tsx`).
3. **Don't read `LOG_LEVEL` at runtime in renderer code.** Main reads it in
   `configureMainLogging()`; the webview gets values baked in
   `renderer_build_env.ts` when the view bundle is built (restart dev after
   changing `LOG_LEVEL`).
4. **Renderer has no `AsyncLocalStorage`.** `node:async_hooks` is unavailable
   in the webview — `configureRendererLogging()` omits `contextLocalStorage`.
5. **SQL and RPC logging is automatic at `debug`+.** You don't need to add
   log lines for DB queries or request lifecycle — `repositoryStmts` and
   `rpcCommonPlugins` handle it.

## Reference

- Canonical guide: [`assets/guides/LOGGING_GUIDE.md`](../../assets/guides/LOGGING_GUIDE.md)
- Testing log output: [`assets/guides/TESTING_GUIDE.md`](../../assets/guides/TESTING_GUIDE.md) § "Asserting on log output"
