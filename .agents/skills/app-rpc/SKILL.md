---
name: app-rpc
description: >
  Load this skill whenever working on the RPC layer of this codebase —
  adding a new endpoint, modifying an existing route, updating TypeBox
  schemas, wiring the Eden Treaty client in the renderer, or syncing the
  preview server. RPC changes are cross-cutting: a route added to server.ts
  must also appear in tools/preview/server.ts, and the Eden Treaty client
  type updates automatically. This skill prevents the most common mistakes
  (Zod in a route, missing preview-server mirror, wrong TypeBox optional
  semantics). Also load it if you're unsure whether a piece of logic belongs
  in the Elysia route or in AppService.
---

# App RPC Patterns (Elysia + Eden Treaty)

## Stack

| Layer      | Package                   | Purpose                            |
| ---------- | ------------------------- | ---------------------------------- |
| Server     | `elysia`                  | Route definition, validation, IoC  |
| Validation | `elysia` → `t` (TypeBox)  | Runtime validation at transport    |
| Client     | `@elysiajs/eden` (Treaty) | Auto-generated type-safe client    |
| DB         | `bun:sqlite`              | Typed prepared statements          |
| Domain     | `@sinclair/typebox`       | Core invariants, config validation |

**Rule:** TypeBox is the sole validation library — `t.*` from elysia/TypeBox in
routes, `Type.Object` + `Value.Check` in core/config. **No Zod, no Drizzle, no
drizzle-typebox.** `*.schema.ts` files contain hand-authored TypeBox shapes;
`*.parser.ts` files contain coercion logic and custom error messages.

---

## Server Definition

```ts
// src/shell/main/rpc/server.ts
import { Elysia, t } from 'elysia'
import type { AppService } from '../../app/app'

export function createRpcServer(app: AppService) {
  return new Elysia()
    .get('/list', ({ query }) => app.list(query), {
      query: t.Object({
        limit: t.Optional(t.Number({ minimum: 1, maximum: 500 })),
        offset: t.Optional(t.Number({ minimum: 0 })),
        q: t.Optional(t.String()),
        type: t.Optional(t.Union([t.Literal('bookmark'), t.Literal('command'), t.Literal('cheat'), t.Literal('task')])),
        tag: t.Optional(t.String()),
        taskView: t.Optional(t.String()),
      })
    })
    .get('/entry/:id', ({ params }) => app.getEntry(Number(params.id)), {
      params: t.Object({ id: t.String() })
    })
    .post('/sync', ({ body }) => app.sync(body.sourcesDir), {
      body: t.Object({ sourcesDir: t.Optional(t.String()) })
    })
    // ... other routes
}

export type RpcApp = ReturnType<typeof createRpcServer>
```

## Client Usage (renderer)

```ts
// src/shell/main/rpc/client.ts  (re-exported; renderer imports from here)
import { treaty } from '@elysiajs/eden'
import type { RpcApp } from './server'

// In Electrobun: IPC via custom protocol, not HTTP.
// The `treaty` call points to the IPC base URL.
export const rpc = treaty<RpcApp>('kb-app')

// Renderer usage:
// import { rpc } from '@rpc/client'
// const { data, error } = await rpc.list.get({ query: { limit: 20 } })
```

## Database Access (bun:sqlite)

```ts
// src/shell/app/db/schema.ts — hand-authored SQL DDL
// src/shell/app/db/client.ts — typed prepared statements
// src/shell/app/db/entry.repository.ts — data access methods

// Example typed query:
// const rows = db.query<KnowledgeRow, [string]>(
//   'SELECT * FROM knowledges WHERE type = ?', [entryType]
// ).all()

// Route response shapes: author a plain TypeBox Object matching the
// DB row shape needed. Use t.Pick() / t.Omit() when only a subset is
// needed. No ORM-derived schema generation.
```

## Elysia in Electrobun (IPC, not HTTP)

Electrobun routes IPC messages through a custom protocol. The Elysia app
is **not** bound to a TCP port in production — it handles messages directly.

```ts
// src/shell/main/rpc/host.ts
import { createRpcServer } from './server'
import type { AppService } from '../../app/app'

export function startRpcHost(app: AppService) {
  const server = createRpcServer(app)
  // Electrobun-specific: register server as IPC handler
  // See assets/guides/ELECTROBUN.md for the exact binding call
  return server
}
```

For the **preview server** (`tools/preview/server.ts`), Elysia runs over
HTTP on `PORT` (default 3456) and is wired identically — same routes,
same `AppService`, no mock logic.

## Adding a New Endpoint — Checklist

- [ ] Add route to `src/shell/main/rpc/server.ts`
- [ ] Add TypeBox body/query/params schema inline (not in a separate file)
- [ ] If DB access needed, write typed prepared statements in the repository
- [ ] Mirror the route in `tools/preview/server.ts`
- [ ] Write a spec in `src/shell/main/rpc/server.spec.ts` (use `app.handle(request)`)
- [ ] Run `bun test && bun run lint` — both must pass before commit

## Gotchas

- Eden Treaty method names mirror HTTP verbs: `.get()`, `.post()`, `.put()`, `.delete()`.
  The route path becomes a chained property: `rpc.entry[':id'].get(...)`.
- TypeBox `t.Optional(T)` means the field may be absent from the object entirely —
  different from `t.Union([T, t.Null()])` which allows `null` as a value.
- Do NOT mix validation libraries in routes or domain modules — TypeBox only.
- The Elysia app is the **only** place where `AppService` methods are called from
  the main process toward the renderer — no direct module imports cross the boundary.
