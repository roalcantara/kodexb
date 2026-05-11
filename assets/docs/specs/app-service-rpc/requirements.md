<!-- markdownlint-disable-file -->
# Phase 5 — App Service + Elysia RPC — Requirements

## INTRODUCTION

Phase 5 replaces the pre-Elysia main↔renderer RPC bridge with a single source of
truth **Elysia app** (`RpcApp`) and a **type-safe Eden Treaty client** in the
renderer.

This phase is a **transport refactor**: the functional core (`src/core/`) and
data layer (`src/shell/app/db/`) remain unchanged. The main process continues
to own all I/O; the renderer continues to own all UI.

**Spec traceability:**

- Normative contract: [`design.md`](design.md)
- Ordered work: [`tasks.md`](tasks.md)
- Implementation detail / code-level plan: [`implementation-plan.md`](implementation-plan.md)

---

## OUT OF SCOPE

- Implementing the currently-stubbed `App` methods (e.g. `createTask`,
  `updateTask`, `pasteInTerminal`, etc.). This phase only exposes them through
  the new transport; behaviour remains as-is.
- Adding new RPC capabilities beyond what exists today in
  `src/shell/main/rpc/requests.ts` and `src/shared/rpc/kb_rpc_schema.ts`.
- Changing the YAML import pipeline, DB schema, or core validation behaviour.

---

## REQUIREMENT SYNTAX (EARS)

- **WHEN** _condition_, **THEN** the system **SHALL** _behaviour_.
- **IF** _condition_, **THEN** the system **SHALL** _behaviour_ (including errors).

Each requirement includes acceptance criteria that are directly verifiable via
commands or test results.

---

## GLOSSARY

- **App / AppService:** The orchestrator class `App` in `src/shell/app/app.ts`.
- **RpcApp:** The Elysia app returned from `createRpcServer(app)`, exported from
  `src/shell/main/rpc/server.ts` as `export type RpcApp = ReturnType<typeof createRpcServer>`.
- **Legacy RPC bridge:** The manual request handlers in
  `src/shell/main/rpc/{requests.ts,schemas.ts}` plus the renderer’s
  `Electroview.defineRPC(...).request.*` usage.
- **Hybrid sync:** Request/response calls use Eden/Elysia; sync progress and
  completion use Electrobun `webview.messages` (`syncProgress`, `syncComplete`).

---

## REQUIREMENT V5-1: Single-source-of-truth RPC contract (RpcApp)

### Acceptance criteria

1. WHEN the desktop app boots, THEN the main process SHALL instantiate one
   `RpcApp` from `createRpcServer(app)` and use it as the transport contract.
2. WHEN the preview server runs (`bun tools/preview/server.ts`), THEN it SHALL
   forward `/api/*` requests through the **same `RpcApp` implementation**
   (no duplicated switch/case logic).
3. WHEN routes are added or removed in `src/shell/main/rpc/server.ts`, THEN the
   preview server SHALL not require any per-route changes to stay in sync.

---

## REQUIREMENT V5-2: Transport parity with existing `/api/<method>` callers

### Acceptance criteria

1. WHEN the preview server is running, THEN `POST /api/getStats` with JSON body
   `{}` SHALL return a JSON response with HTTP 200.
2. WHEN the renderer calls existing RPC wrappers (e.g. list, getEntry,
   getListStats), THEN the app SHALL continue to function without requiring a
   UI-layer refactor beyond swapping the transport client.

---

## REQUIREMENT V5-3: TypeBox validation at the transport boundary

### Acceptance criteria

1. WHEN any `/api/*` request body does not satisfy its TypeBox schema, THEN the
   server SHALL return a structured JSON error with HTTP 500 (matching the
   existing preview behaviour of surfacing transport failures).
2. WHEN `rg -n \"from 'zod'\" src/` runs, THEN the system SHALL produce zero
   matches for route validation code.

---

## REQUIREMENT V5-4: Renderer uses Eden Treaty for request/response RPC

### Acceptance criteria

1. WHEN searching `src/shell/renderer/` for `Electroview.defineRPC` request
   invocations, THEN the renderer SHALL no longer use `rpc.request.*` for
   request/response calls (Eden Treaty is used instead).
2. WHEN `bun run typecheck` runs, THEN the Eden client SHALL be type-safe
   against the `RpcApp` contract.

---

## REQUIREMENT V5-5: Main→renderer sync messages preserved (hybrid sync)

### Acceptance criteria

1. WHEN `App.sync` emits progress via `emit.syncProgress(processed, total)`,
   THEN the renderer SHALL receive `syncProgress` messages through Electrobun
   `webview.messages`.
2. WHEN `App.sync` completes and emits `emit.syncComplete(result)`, THEN the
   renderer SHALL receive `syncComplete` with the same `RpcImportResult` shape.

---

## REQUIREMENT V5-6: Removal of the legacy manual RPC maps

### Acceptance criteria

1. WHEN Phase 5 is complete, THEN `src/shell/main/rpc/requests.ts` and its spec
   SHALL be removed (or unused and deleted) and there SHALL be exactly one
   request/response RPC contract (`RpcApp`).
2. WHEN `bun test` runs, THEN the new `server.spec.ts` SHALL cover the Elysia
   `app.handle(new Request(...))` integration path.

