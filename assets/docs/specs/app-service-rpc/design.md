<!-- markdownlint-disable-file -->
# Phase 5 — App Service + Elysia RPC — Design

## OVERVIEW

Phase 5 delivers the **main↔renderer transport contract** for kb:

- A single Elysia app (`RpcApp`) defines the request/response API surface.
- The renderer uses Eden Treaty (`@elysiajs/eden`) to call the Elysia app.
- The desktop runtime binds calls over **Electrobun IPC**.
- The preview server binds the same app over **HTTP** (no mock shims).
- Transport validation uses **TypeBox only**.

This phase is a transport-layer refactor. `App` remains the orchestrator and
the data layer remains unchanged.

---

## SCOPE DECISIONS

| Decision                 | Choice                                    | Rationale                                                                                          |
| ------------------------ | ----------------------------------------- | -------------------------------------------------------------------------------------------------- |
| HTTP API shape           | **Keep** `POST /api/<method>`             | Matches existing `tools/preview/mock_electroview.ts` and preview server. Avoids UI refactor churn. |
| Sync progress/completion | **Hybrid**: Electrobun `webview.messages` | Eden/Elysia is request/response; progress is push. Preserve existing message names.                |
| Task mutation semantics  | **No behaviour change**                   | `App` methods remain `Not implemented` where they already are; Phase 5 only migrates transport.    |
| Validation library       | **TypeBox only**                          | Matches foundation decision; no Zod.                                                               |
| Preview parity           | **Forward to RpcApp.handle**              | Eliminates drift and duplicated switch/case logic.                                                 |

---

## FILES AND RESPONSIBILITIES

### Main process (desktop)

- `src/shell/main/rpc/server.ts`
  - Exports `createRpcServer(app: App)` returning an Elysia app with
    `{ prefix: '/api' }`.
  - Exports `export type RpcApp = ReturnType<typeof createRpcServer>`.
  - Defines thin routes with TypeBox body schemas and delegates to `App`.

- `src/shell/main/rpc/host.ts`
  - Binds renderer RPC calls (Eden requests) to `rpc.handle(request)` via the
    correct Electrobun IPC API (from skills/docs).
  - Wires `App`’s `SyncEmitter` to `win.webview.rpc.send.syncProgress` and
    `win.webview.rpc.send.syncComplete`.

- `src/shell/main/main.ts`
  - Boots config + `App` + `RpcApp` + host binding.
  - Constructs `AppShellHooks` as needed (external open, dialogs, resize) using
    Electrobun-native capabilities.

### Renderer (React)

- `src/shell/renderer/rpc/client.ts`
  - Exposes stable wrapper functions (e.g. `listEntries`, `getEntry`, etc.).
  - Uses Eden Treaty for request/response.
  - Keeps `Electroview.defineRPC` for **messages only** (`syncProgress`,
    `syncComplete`).

- `src/shell/renderer/rpc/rpc_app.types.ts`
  - Type-only re-export of `RpcApp` for treaty typing:

    `export type { RpcApp } from '../../main/rpc/server'`

  If dependency-cruiser forbids renderer→main even for type-only imports, add a
  **narrow exception** for this file only and verify bundling keeps it type-only.

### Preview server

- `tools/preview/server.ts`
  - Builds renderer bundle as today.
  - For `POST /api/*`, forwards the request to `rpc.handle(...)`.
  - Does not implement per-method switch/case.

---

## NORMATIVE RPC CONTRACT

### Base

- **Prefix:** `/api`
- **Method:** `POST`
- **Request content-type:** `application/json`
- **Request body:** JSON object (sometimes empty `{}`)
- **Response:** JSON (success) or `{ error: string }` (transport errors)

### Routes

Routes are listed as path → request schema → `App` call.

| Path                     | TypeBox body schema                         | App call                                    |
| ------------------------ | ------------------------------------------- | ------------------------------------------- |
| `/api/list`              | `listOptsSchema` (or union with empty body) | `app.list(body)`                            |
| `/api/getListStats`      | `emptyBodySchema`                           | `app.getListStats()`                        |
| `/api/getEntry`          | `getEntryParams`                            | `app.getEntry(body.id)`                     |
| `/api/sync`              | `syncParamsInner`                           | `app.sync(body.sourcesDir)`                 |
| `/api/getStats`          | `emptyBodySchema`                           | `app.getStats()`                            |
| `/api/getConfig`         | `emptyBodySchema`                           | `app.getConfig()`                           |
| `/api/saveConfig`        | `configPatchSchema`                         | `app.applyConfigPatch(body)`                |
| `/api/createTask`        | `taskCreateSchema`                          | `app.createTask(body)`                      |
| `/api/updateTask`        | `taskUpdateSchema`                          | `app.updateTask(body.id, body.patch)`       |
| `/api/deleteTask`        | `getEntryParams`                            | `app.deleteTask(body.id)`                   |
| `/api/cycleStatus`       | `idWithDirSchema`                           | `app.cycleStatus(body.id, body.dir)`        |
| `/api/cyclePriority`     | `idWithDirSchema`                           | `app.cyclePriority(body.id, body.dir)`      |
| `/api/reorderTask`       | `idWithReorderDirSchema`                    | `app.reorderTask(body.id, body.dir)`        |
| `/api/openExternal`      | `openExternalSchema`                        | `app.openExternal(body.url)`                |
| `/api/pasteInTerminal`   | `pasteInTerminalSchema`                     | `app.pasteInTerminal(body.cmd)`             |
| `/api/openInEditor`      | `openInEditorSchema`                        | `app.openInEditor(body.filePath)`           |
| `/api/showOpenDialog`    | `showOpenDialogSchema`                      | `app.showOpenDialog(body.opts)`             |
| `/api/fetchPreviewImage` | `openExternalSchema`                        | `app.fetchPreviewImage(body.url)`           |
| `/api/suggestTags`       | `suggestTagsSchema`                         | `app.suggestTags(body.entryId)`             |
| `/api/resizeWindow`      | `resizeWindowSchema`                        | `app.resizeWindow(body.width, body.height)` |

### Transport error model

- Validation and handler failures are returned as:

```json
{ "error": "<message>" }
```

with HTTP status `500`.

Rationale: this matches existing preview behaviour (`tools/preview/server.ts`)
and avoids introducing new error plumbing during a transport-only refactor.

---

## SYNC PUSH CONTRACT (MAIN → RENDERER)

The following messages MUST remain available via Electrobun `webview.messages`
to preserve the existing `App.sync` emitter usage:

- `syncProgress`: `{ processed: number, total: number }`
- `syncComplete`: `RpcImportResult`

These are handled in the renderer via `Electroview.defineRPC({ handlers: { messages: ... } })`.

---

## TESTING STRATEGY

- **RpcApp routes:** integration tests using `rpc.handle(new Request(...))` in
  `src/shell/main/rpc/server.spec.ts`.
- **Schema consolidation:** existing `requests.spec.ts` remains green until
  legacy bridge is removed.
- **Renderer:** unit tests on the wrapper functions in
  `src/shell/renderer/rpc/client.spec.ts` (or similar), verifying that the Eden
  client is invoked and errors surface consistently.
- **Preview:** smoke test via `bun tools/preview/server.ts` plus a `curl` POST
  to `/api/getStats`.

