<!-- markdownlint-disable-file -->
# Phase 5 — App Service + Elysia RPC Implementation Plan

> **For agentic workers:** Use `subagent-driven-development` (recommended) or `executing-plans` to implement this plan **task-by-task**. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the manual Electrobun request map (`src/shell/main/rpc/requests.ts` + `parseRpcPayload`) and the ad-hoc preview `/api/*` switch with a **single Elysia `RpcApp`**: `createRpcServer(app)` in `src/shell/main/rpc/server.ts`, bound to **Electrobun IPC** in the desktop main process and to **HTTP** in `tools/preview/server.script.ts`. The renderer uses **Eden Treaty** (`@elysiajs/eden`) for all **request/response** RPC; **main→renderer sync progress** stays on the existing **`webview.messages`** channel (`syncProgress`, `syncComplete`) via a **hybrid** bridge (Eden + Electrobun messages only).

**Architecture:** `App` (`src/shell/app/app.ts`) remains the sole orchestrator for DB, import, config, and shell hooks. Elysia routes are **thin**: validate with TypeBox (`@sinclair/typebox` schemas shared from `schemas.ts`), call `App` methods, return JSON-serializable values. No `zod`. No repository imports from route files. `RpcApp = ReturnType<typeof createRpcServer>` becomes the **transport contract**; `appDesktopRpcSchema`’s **`bun.requests`** half is retired once Eden is live (keep **`webview.messages`** types until a slimmer shared type file exists).

**Tech Stack:** Bun, `elysia`, `@elysiajs/eden`, `@sinclair/typebox`, `electrobun` (main + view), existing `App` / `ImportService` / `entry.repository`.

**Spec siblings:** Add or keep in lockstep [`requirements.md`](requirements.md) and [`design.md`](design.md) in this folder (EARS + normative route table). This **implementation-plan** is executable detail; if `requirements.md` / `design.md` are missing, create them **first** (short is fine) so the normative contract exists before merge.

**Normative route map (all `POST`, prefix `/api`, JSON body — matches current preview `fetch('/api/${method}', { body: JSON.stringify(params) })`):**

| Path                     | Body schema (TypeBox)         | `App` method                |
| ------------------------ | ----------------------------- | --------------------------- |
| `/api/list`              | `listOptsSchema` (allow `{}`) | `list(body)`                |
| `/api/getListStats`      | empty object                  | `getListStats()`            |
| `/api/getEntry`          | `getEntryParams`              | `getEntry(id)`              |
| `/api/sync`              | `syncParamsInner`             | `sync(sourcesDir?)`         |
| `/api/getStats`          | empty object                  | `getStats()`                |
| `/api/getConfig`         | empty object                  | `getConfig()`               |
| `/api/saveConfig`        | `configPatchSchema`           | `applyConfigPatch(patch)`   |
| `/api/createTask`        | `taskCreateSchema`            | `createTask(input)`         |
| `/api/updateTask`        | `taskUpdateSchema`            | `updateTask(id, patch)`     |
| `/api/deleteTask`        | `getEntryParams`              | `deleteTask(id)`            |
| `/api/cycleStatus`       | `idWithDirSchema`             | `cycleStatus(id, dir)`      |
| `/api/cyclePriority`     | `idWithDirSchema`             | `cyclePriority(id, dir)`    |
| `/api/reorderTask`       | `idWithReorderDirSchema`      | `reorderTask(id, dir)`      |
| `/api/openExternal`      | `openExternalSchema`          | `openExternal(url)`         |
| `/api/pasteInTerminal`   | `pasteInTerminalSchema`       | `pasteInTerminal(cmd)`      |
| `/api/openInEditor`      | `openInEditorSchema`          | `openInEditor(filePath)`    |
| `/api/showOpenDialog`    | `showOpenDialogSchema`        | `showOpenDialog(body.opts)` |
| `/api/fetchPreviewImage` | `openExternalSchema`          | `fetchPreviewImage(url)`    |
| `/api/suggestTags`       | `suggestTagsSchema`           | `suggestTags(entryId)`      |
| `/api/resizeWindow`      | `resizeWindowSchema`          | `resizeWindow(w, h)`        |

**Empty-body routes:** Use `Type.Object({}, { additionalProperties: false })` as `body` schema, or Elysia’s equivalent, so `POST` with `{}` validates.

---

## Verification commands

| Goal            | Command                                                            |
| --------------- | ------------------------------------------------------------------ |
| Typecheck       | `bun run typecheck`                                                |
| RPC + app tests | `bun test src/shell/main/rpc src/shell/app src/shell/renderer/rpc` |
| Full suite      | `bun test`                                                         |
| Lint gate       | `bun run lint`                                                     |
| Preview smoke   | `bun tools/preview/server.script.ts` then open `http://localhost:3456`    |

---

## File structure (create / modify)

| Path                                      | Role                                                                                                            |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `package.json`                            | Add `elysia`, `@elysiajs/eden`                                                                                  |
| `src/shell/main/rpc/schemas.ts`           | Export **all** RPC payload schemas (move inline types from `requests.ts`)                                       |
| `src/shell/main/rpc/server.ts`            | **`createRpcServer(app)`**, export **`RpcApp`** type                                                            |
| `src/shell/main/rpc/server.spec.ts`       | `app.handle(Request)` integration tests                                                                         |
| `src/shell/main/rpc/host.ts`              | Electrobun ↔ `handle(Request)` bridge (see Task 5)                                                              |
| `src/shell/main/main.ts`                  | Boot `loadConfig` → `App` + `emit` + `createRpcServer` + host + window                                          |
| `src/shell/main/index.ts`                 | May stay one line importing `main.ts`                                                                           |
| `src/shell/renderer/rpc/client.ts`        | Eden `treaty<RpcApp>` + thin wrappers; **keep** `setSyncMessageHandlers` + Electrobun **messages** registration |
| `tools/preview/server.script.ts`                 | Delegate `/api/*` to same `createRpcServer(app)`                                                                |
| `tools/preview/mock_electroview.script.ts`       | Optional: route through Eden with `window.location.origin` instead of raw `fetch` proxy                         |
| `src/shell/main/rpc/requests.ts`          | Delete after parity + tests moved (or keep thin re-export only if needed temporarily)                           |
| `src/shell/main/rpc/requests.spec.ts`     | Migrate assertions to `server.spec.ts`, then delete                                                             |
| `src/shared/rpc/app_rpc_schema.ts`        | Remove `bun.requests` from schema type; keep `webview.messages` for Electrobun typing until simplified          |
| `assets/docs/specs/foundation/roadmap.md` | Mark Phase 5 done when verified                                                                                 |

---

## Task 1: Dependencies

**Files:** Modify `package.json`, run install.

- [ ] **Step 1: Add packages**

```bash
cd /Users/roalcantara/Work/bun/app
bun add elysia @elysiajs/eden
```

Expected: `package.json` lists `"elysia"` and `"@elysiajs/eden"` under `dependencies`.

- [ ] **Step 2: Lockfile**

```bash
bun install
```

Expected: `bun.lock` updated; `bun run typecheck` still passes (may fail until server imports exist — OK before Task 3).

- [ ] **Step 3: Commit**

```bash
git add package.json bun.lock
git commit -m "chore(rpc): add elysia and eden treaty"
```

---

## Task 2: Consolidate RPC schemas in `schemas.ts`

**Files:** Modify `src/shell/main/rpc/schemas.ts`, modify `src/shell/main/rpc/requests.ts` (imports only until deleted).

**Goal:** Every POST body schema is an **exported** `Type.Object` from `schemas.ts` so `server.ts` and any remaining legacy code share one definition.

- [ ] **Step 1: Append the following exports to `schemas.ts`** (move verbatim from `requests.ts` lines 16–58, adjusting only imports — use existing `Type` import).

```typescript
import { Type } from '@sinclair/typebox'

export const emptyBodySchema = Type.Object({}, { additionalProperties: false })

export const openExternalSchema = Type.Object(
  { url: Type.String({ minLength: 1 }) },
  { additionalProperties: false }
)
export const pasteInTerminalSchema = Type.Object(
  { cmd: Type.String({ minLength: 1 }) },
  { additionalProperties: false }
)
export const openInEditorSchema = Type.Object(
  { filePath: Type.String({ minLength: 1 }) },
  { additionalProperties: false }
)
export const suggestTagsSchema = Type.Object(
  { entryId: Type.Integer() },
  { additionalProperties: false }
)
export const resizeWindowSchema = Type.Object(
  {
    width: Type.Integer({ minimum: 1 }),
    height: Type.Integer({ minimum: 1 })
  },
  { additionalProperties: false }
)

export const idWithDirSchema = Type.Object(
  {
    id: Type.Integer(),
    dir: dirSchema
  },
  { additionalProperties: false }
)

export const idWithReorderDirSchema = Type.Object(
  {
    id: Type.Integer(),
    dir: reorderDirSchema
  },
  { additionalProperties: false }
)

/** POST body may be `{}` or `{ opts?: { … } }` — avoid `Type.Optional` wrapping the whole object (Elysia body). */
export const showOpenDialogSchema = Type.Object(
  {
    opts: Type.Optional(
      Type.Object(
        {
          title: Type.Optional(Type.String()),
          defaultPath: Type.Optional(Type.String()),
          properties: Type.Optional(
            Type.Array(Type.Union([Type.Literal('openFile'), Type.Literal('openDirectory')]))
          )
        },
        { additionalProperties: false }
      )
    )
  },
  { additionalProperties: false }
)
```

- [ ] **Step 2: Change `requests.ts`** to import these symbols from `./schemas` and **delete** the duplicate inline `Type.Object` definitions (keep `appRpc*` functions using `parseRpcPayload` until Task 9 removes the file).

- [ ] **Step 3: Run tests**

```bash
bun test src/shell/main/rpc/requests.spec.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/shell/main/rpc/schemas.ts src/shell/main/rpc/requests.ts
git commit -m "refactor(rpc): centralize RPC payload schemas"
```

---

## Task 3: `createRpcServer` — `server.ts`

**Files:** Create `src/shell/main/rpc/server.ts`

**Goal:** One Elysia instance, `{ prefix: '/api' }`, all routes from the normative table. Use **Standard TypeBox** schemas in route `body` options (Elysia accepts Sinclair `TSchema`).

- [ ] **Step 1: Create `server.ts`** with the full implementation below.

```typescript
import { Elysia } from 'elysia'

import type { App } from '../../app/app'
import {
  configPatchSchema,
  emptyBodySchema,
  getEntryParams,
  idWithDirSchema,
  idWithReorderDirSchema,
  listOptsSchema,
  openExternalSchema,
  openInEditorSchema,
  pasteInTerminalSchema,
  resizeWindowSchema,
  showOpenDialogSchema,
  suggestTagsSchema,
  syncParamsInner,
  taskCreateSchema,
  taskUpdateSchema
} from './schemas'

export function createRpcServer(appInstance: App) {
  return (
    new Elysia({ prefix: '/api' })
      .onError(({ error, set }) => {
        const message = error instanceof Error ? error.message : String(error)
        set.status = 500
        return { error: message }
      })
      .post('/list', ({ body }) => appInstance.list(body), { body: listOptsSchema })
      .post('/getListStats', () => appInstance.getListStats(), { body: emptyBodySchema })
      .post('/getEntry', ({ body }) => appInstance.getEntry(body.id), { body: getEntryParams })
      .post('/sync', ({ body }) => appInstance.sync(body.sourcesDir), { body: syncParamsInner })
      .post('/getStats', () => appInstance.getStats(), { body: emptyBodySchema })
      .post('/getConfig', () => appInstance.getConfig(), { body: emptyBodySchema })
      .post('/saveConfig', ({ body }) => appInstance.applyConfigPatch(body), { body: configPatchSchema })
      .post('/createTask', ({ body }) => appInstance.createTask(body), { body: taskCreateSchema })
      .post('/updateTask', ({ body }) => appInstance.updateTask(body.id, body.patch), { body: taskUpdateSchema })
      .post('/deleteTask', ({ body }) => appInstance.deleteTask(body.id), { body: getEntryParams })
      .post('/cycleStatus', ({ body }) => appInstance.cycleStatus(body.id, body.dir), { body: idWithDirSchema })
      .post('/cyclePriority', ({ body }) => appInstance.cyclePriority(body.id, body.dir), { body: idWithDirSchema })
      .post('/reorderTask', ({ body }) => appInstance.reorderTask(body.id, body.dir), { body: idWithReorderDirSchema })
      .post('/openExternal', ({ body }) => appInstance.openExternal(body.url), { body: openExternalSchema })
      .post('/pasteInTerminal', ({ body }) => appInstance.pasteInTerminal(body.cmd), { body: pasteInTerminalSchema })
      .post('/openInEditor', ({ body }) => appInstance.openInEditor(body.filePath), { body: openInEditorSchema })
      .post('/showOpenDialog', ({ body }) => appInstance.showOpenDialog(body.opts), { body: showOpenDialogSchema })
      .post('/fetchPreviewImage', ({ body }) => appInstance.fetchPreviewImage(body.url), { body: openExternalSchema })
      .post('/suggestTags', ({ body }) => appInstance.suggestTags(body.entryId), { body: suggestTagsSchema })
      .post('/resizeWindow', ({ body }) => appInstance.resizeWindow(body.width, body.height), { body: resizeWindowSchema })
  )
}

export type RpcApp = ReturnType<typeof createRpcServer>
```

**Note:** If `listOptsSchema` rejects a missing JSON body, add Elysia `parse: 'json'` and default `body` to `{}` on the route, or wrap with `Type.Union([emptyBodySchema, listOptsSchema])` — adjust until `POST` with `{}` matches preview behaviour.

- [ ] **Step 2: Typecheck**

```bash
bun run typecheck
```

Fix any Elysia/type mismatch until clean.

- [ ] **Step 3: Commit**

```bash
git add src/shell/main/rpc/server.ts
git commit -m "feat(rpc): add Elysia RpcApp server"
```

---

## Task 4: `server.spec.ts`

**Files:** Create `src/shell/main/rpc/server.spec.ts`

**Goal:** Integration-style tests via `app.handle(new Request(...))` — no Electrobun. Use existing `App` construction pattern from `requests.spec.ts` / `app.spec.ts` (in-memory or temp DB per project norm).

- [ ] **Step 1: Create the spec file** with at least these tests (copy `App` bootstrap from `src/shell/main/rpc/requests.spec.ts` `beforeEach` / factory pattern):

1. `POST /api/list` with `{}` returns `200` and JSON array.
2. `POST /api/getListStats` with `{}` returns `200` and object with numeric fields.
3. `POST /api/getEntry` with invalid body returns `500` and `{ error: ... }` (validation path).

Example request factory:

```typescript
function postJson(path: string, body: unknown): Request {
  return new Request(`http://local${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
}
```

Use path **`/api/list`** (Elysia `prefix` + route).

- [ ] **Step 2: Run**

```bash
bun test src/shell/main/rpc/server.spec.ts
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/shell/main/rpc/server.spec.ts
git commit -m "test(rpc): cover Elysia RpcApp handle"
```

---

## Task 5: Electrobun host bridge — `host.ts`

**Files:** Create `src/shell/main/rpc/host.ts`, create `src/shell/main/rpc/host.spec.ts` if you can unit-test pure `Request` builders without CEF.

**Goal:** Renderer Eden calls must reach `RpcApp.handle` in the main process. **Do not guess** Electrobun APIs.

- [ ] **Step 1: Read skills**

Read `.cursor/electrobun-skill-routing.md`, then `~/.agents/skills/electrobun-rpc/SKILL.md` (or symlinked path), plus `assets/guides/ELECTROBUN.md`.

- [ ] **Step 2: Choose bridge strategy** (document in `design.md`):

  - **Preferred:** If Electrobun exposes a **single** generic request hook, implement `forwardToElysia(req: Request): Promise<Response>` and call `rpcServer.handle(req)`.
  - **Fallback:** If the schema must remain `ElectrobunRPCSchema`-shaped during transition, register **one** bun-side request like `rpcCall` with body `{ path: string, init?: ... }` that builds a `Request` and returns `Response.json(...)` from `handle`.

- [ ] **Step 3: Implement `host.ts`** exporting e.g. `wireRpcToWebview(win: BrowserWindow, rpc: RpcApp, app: App): void` that:

  1. Registers handlers so every renderer Eden call ends in `rpc.handle(...)`.
  2. Wires `app` sync emitters: `syncProgress` / `syncComplete` → `win.webview.rpc.send.syncProgress(...)` / `syncComplete(...)` per official API (names must match `src/shell/renderer/rpc/client.ts` listeners).

- [ ] **Step 4: Manual smoke** (no automated CEF in CI unless already present): `bun run dev` — list view still loads.

- [ ] **Step 5: Commit**

```bash
git add src/shell/main/rpc/host.ts src/shell/main/rpc/host.spec.ts 2>/dev/null
git commit -m "feat(rpc): wire Elysia app to Electrobun webview"
```

---

## Task 6: Main process bootstrap

**Files:** Modify `src/shell/main/main.ts` (and `index.ts` only if imports change).

**Goal:** Construct `LoadedConfig` via `loadConfig()`, instantiate `App` with:

- `emit.syncProgress` / `emit.syncComplete` → forward to webview RPC send (same as Task 5; avoid duplicate wiring — **either** construct `App` with emit callbacks supplied by `host.ts`, **or** have `host.ts` patch `app` emitters after creation; pick one pattern and document it).

Then `createRpcServer(app)` + `wireRpcToWebview(win, rpc, app)` before/after `win.show()` per Electrobun lifecycle requirements.

- [ ] **Step 1: Implement bootstrap** (pseudo-structure — fill with real imports):

```typescript
import { BrowserWindow } from 'electrobun/bun'
import { App } from '../app/app'
import { loadConfig } from '../app/config/config.loader'
import { createRpcServer } from './rpc/server'
import { wireRpcToWebview } from './rpc/host'

const config = await loadConfig()
const win = new BrowserWindow({ /* existing options from current main.ts */ })
const app = new App(config, {}, false, {
  resizeWindow: (w, h) => {
    /* set window size via win if API exists */
  },
  openExternal: url => {
    /* Electrobun / OS open external — see official docs */
  },
  showOpenDialog: async opts => {
    /* native dialog */
  }
})
const rpc = createRpcServer(app)
wireRpcToWebview(win, rpc, app)
win.show()
win.focus()
```

**Note:** Populate `AppShellHooks` from the previous stash/legacy implementation if `main.ts` currently leaves them empty — `openExternal`, `showOpenDialog`, and `resizeWindow` must work for Phase 6 UX. If those hooks are not yet implemented on `BrowserWindow`, stub with `rejectNotImplemented` behaviour only where acceptable.

- [ ] **Step 2: Run typecheck + tests**

```bash
bun run typecheck
bun test src/shell/main
```

- [ ] **Step 3: Commit**

```bash
git add src/shell/main/main.ts
git commit -m "feat(main): boot App and RpcApp with Electrobun host"
```

---

## Task 7: Renderer — Eden Treaty client

**Files:** Modify `src/shell/renderer/rpc/client.ts`, add `src/shell/renderer/rpc/client.spec.ts` if missing (required by repo rule for touched files).

**Goal:** Replace `appWebviewRpc.request.*` with `treaty<RpcApp>(baseUrl, options?)` where:

- **Preview / Happy-DOM:** `baseUrl` is `window.location.origin` (same as today’s `fetch('/api/...')`).
- **Desktop:** `baseUrl` is a placeholder string; **`fetch`** is overridden via Eden’s `fetcher` (or documented Eden option) to call the Electrobun IPC bridge from Task 5.

Keep:

```typescript
export function setSyncMessageHandlers(handlers: { ... }): void
```

**`RpcApp` typing (FCIS):** `src/shared/` must not import `src/shell/main/`. Add a **renderer-only** barrel `src/shell/renderer/rpc/rpc_app.types.ts`:

```typescript
export type { RpcApp } from '../../main/rpc/server'
```

Run `bunx depcruise src --config .dependency-cruiser.cjs`. If renderer→main is blocked even for `import type`, add a **documented** `dependency-cruiser` exception for this file only, and verify the production renderer bundle does **not** include `server.ts` runtime (type-only strip).

- [ ] **Step 1: Add `src/shell/renderer/rpc/rpc_app.types.ts`** as above.

- [ ] **Step 2: Rewrite `client.ts`**

**Preview:** `treaty<RpcApp>(window.location.origin)` (or test default URL) — no custom `fetch`.

**Desktop:** pass Eden’s non-HTTP transport hook (**exact option name** from your `@elysiajs/eden` version — e.g. custom `fetch`) so each call becomes the Electrobun bridge from Task 5. Avoid ad-hoc `window.*` globals unless Electrobun’s bootstrap requires it.

```typescript
import { treaty } from '@elysiajs/eden'
import type { RpcApp } from './rpc_app.types'
import { Electroview } from 'electrobun/view'

const rpc = treaty<RpcApp>(/* baseUrl + options per environment */)
```

Example wrapper (adjust `res` to Eden’s actual discriminated union):

```typescript
export function listEntries(opts: ListOpts = {}): Promise<RpcKnowledge[]> {
  return rpc.api.list.post(opts).then(res => {
    if (res.error) throw new Error(String(res.error))
    return res.data as RpcKnowledge[]
  })
}
```

Read `node_modules/@elysiajs/eden` type definitions for the correct `treaty` options and response shape.

- [ ] **Step 3: Keep `Electroview.defineRPC`** only for **`messages`** (`syncProgress`, `syncComplete`); **`requests`** empty `{}`.

- [ ] **Step 4: Run renderer tests**

```bash
bun test src/shell/renderer/rpc
```

- [ ] **Step 5: Commit**

```bash
git add src/shell/renderer/rpc/client.ts src/shell/renderer/rpc/rpc_app.types.ts src/shell/renderer/rpc/client.spec.ts
git commit -m "feat(renderer): use Eden Treaty for RpcApp"
```

---

## Task 8: Preview server — single `handle`

**Files:** Modify `tools/preview/server.script.ts`

**Goal:** Remove the `switch (method)` RPC block. For `POST` under `/api/*`, build `Request` with full URL and forward:

```typescript
const rpc = createRpcServer(app)

// inside fetch handler:
if (req.method === 'POST' && url.pathname.startsWith('/api/')) {
  const forward = new Request(req.url, { method: 'POST', headers: req.headers, body: req.body })
  return rpc.handle(forward)
}
```

Ensure **Content-Type** and body stream are preserved. If `req.body` is consumed, clone first.

- [ ] **Step 1: Edit `tools/preview/server.script.ts`** per above; delete duplicated per-method cases.

- [ ] **Step 2: Smoke**

```bash
bun tools/preview/server.script.ts
# curl smoke:
curl -s -X POST http://localhost:3456/api/getStats -H 'Content-Type: application/json' -d '{}' | head -c 200
```

Expected: JSON stats object, not `404`.

- [ ] **Step 3: Commit**

```bash
git add tools/preview/server.script.ts
git commit -m "feat(preview): forward HTTP to Elysia RpcApp"
```

---

## Task 9: Remove legacy request handlers

**Files:** Delete `src/shell/main/rpc/requests.ts`, delete `src/shell/main/rpc/requests.spec.ts`, grep for `appRpcDataHandlers` / `parseRpcPayload` imports.

- [ ] **Step 1: Search**

```bash
rg "requests\.ts|appRpcDataHandlers|appRpcTaskHandlers|appRpcOpenHandlers|appRpcDialogHandlers" src tools
```

Remove all references.

- [ ] **Step 2: Tests**

```bash
bun test
```

- [ ] **Step 3: Commit**

```bash
git rm src/shell/main/rpc/requests.ts src/shell/main/rpc/requests.spec.ts
git commit -m "refactor(rpc): remove manual Electrobun handler maps"
```

---

## Task 10: Tighten `appDesktopRpcSchema`

**Files:** Modify `src/shared/rpc/app_rpc_schema.ts`

**Goal:** Type-only schema for Electrobun **messages** path; remove unused `bun.requests` entries **or** replace `bun.requests` with `Record<string, never>` if Electrobun type requires the key — follow TypeScript errors.

- [ ] **Step 1: Edit** until `bun run typecheck` passes and renderer `defineRPC` matches.

- [ ] **Step 2: Commit**

```bash
git add src/shared/rpc/app_rpc_schema.ts
git commit -m "refactor(rpc): slim Electrobun schema to messages-only"
```

---

## Task 11: Documentation + roadmap

**Files:** `assets/docs/specs/app-service-rpc/requirements.md`, `design.md`, `assets/docs/specs/foundation/roadmap.md`

- [ ] **Step 1:** Write/adjust `requirements.md` + `design.md` to match what shipped (route table, hybrid sync, IPC bridge file names).

- [ ] **Step 2:** In `roadmap.md`, set Phase 5 row to done (same style as Phase 4).

- [ ] **Step 3: Commit**

```bash
git add assets/docs/specs/app-service-rpc assets/docs/specs/foundation/roadmap.md
git commit -m "docs(rpc): record Phase 5 app service + Elysia RPC"
```

---

## Task 12: Quality gate

- [ ] **Step 1:**

```bash
bun run lint
bun test
```

- [ ] **Step 2:** Fix knip / unused exports if new files tripped rules.

- [ ] **Step 3: Final commit** (if fixes needed)

```bash
git commit -m "chore(rpc): quality gate after Phase 5"
```

---

## Plan self-review

| Spec / requirement       | Task coverage |
| ------------------------ | ------------- |
| Single `RpcApp` SSOT     | Task 3, 8     |
| TypeBox-only transport   | Tasks 2–3     |
| Thin routes → `App` only | Task 3        |
| Eden renderer            | Task 7        |
| Preview mirrors desktop  | Task 8        |
| Electrobun IPC           | Tasks 5–6     |
| Sync push hybrid         | Tasks 5–7     |
| Remove manual handlers   | Task 9        |
| Tests co-located         | Tasks 4, 7    |
| Roadmap / docs           | Task 11       |

**Placeholder scan:** None intentional; Task 5–7 contain **research-dependent** branches — resolving them is the first coding substep, not a TBD skip.

**Type consistency:** All `/api/*` paths match `mock_electroview.ts` `fetch('/api/${method}')` method names **exactly** (`getListStats` not `get_list_stats`).

---

## Execution handoff

**Plan complete and saved to** `assets/docs/specs/app-service-rpc/implementation-plan.md`.

**Two execution options:**

1. **Subagent-driven (recommended)** — Fresh subagent per task; review between tasks.
2. **Inline execution** — One agent runs tasks in order with human checkpoints after Tasks 4, 6, 8, 12.

**Which approach do you want?** (Reply in chat; the next implementing agent should declare the same at kickoff.)
