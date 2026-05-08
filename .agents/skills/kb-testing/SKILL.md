---
name: kb-testing
description: >
  Load this skill before writing or modifying any test in the kb codebase —
  unit tests, integration tests, renderer component specs, or Elysia RPC
  handler tests. It defines the no-mock rule (real implementations with
  controlled inputs, always), the drizzle-seed fixture pattern for in-memory
  SQLite, Happy-DOM setup for React components, the server.handle() pattern
  for RPC route testing, and coverage requirements (≥ 80%). Load it even for
  small test fixes — wrong patterns (mocking AppService, using a real SQLite
  file, creating real HTTP ports) compound fast and are expensive to unwind.
---

# kb Testing Conventions

## Runner & Framework

```bash
bun test                   # run all specs
bun test --watch           # watch mode
bun test src/shell/app/    # run subset
```

Use `bun:test` only — no Jest, Vitest, or Mocha.

---

## Test File Location

Co-locate every spec next to its source file:

```
src/shell/app/app.ts          → src/shell/app/app.spec.ts
src/shell/renderer/list.page.tsx → src/shell/renderer/list.page.spec.tsx
src/shell/main/rpc/server.ts  → src/shell/main/rpc/server.spec.ts
```

---

## No-Mock Rule

**Do not mock real implementations.** Use real code with controlled inputs.

| Instead of mocking…       | Do this instead                              |
|---------------------------|----------------------------------------------|
| `AppService`              | Instantiate with an in-memory DB fixture     |
| SQLite DB                 | `new Database(':memory:')` + drizzle-seed    |
| File system               | `createTempDir()` helper from `@testing`     |
| `fetch` / network         | `data:` URIs or a local Bun.serve() fixture  |

---

## In-Memory SQLite + drizzle-seed

```ts
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { Database } from 'bun:sqlite'
import { seed } from 'drizzle-seed'
import * as schema from '@db/schema'

async function createTestDb() {
  const sqlite = new Database(':memory:')
  const db = drizzle(sqlite, { schema })
  // Run migrations
  // (or use the migrate helper from src/shell/app/db/index.ts)
  await seed(db, schema).refine((f) => ({
    knowledges: {
      count: 10,
      with: {
        type: f.valuesFromArray({ values: ['bookmark', 'command', 'cheat', 'task'] }),
        tags: f.json(),
      }
    }
  }))
  return { db, sqlite }
}
```

Use `afterEach(() => sqlite.close())` to release the in-memory DB.

---

## AppService Test Fixture

```ts
import { AppService } from '@app/app'
import type { LoadedConfig } from '@app/config/config.loader'

async function appFixture(): Promise<{ app: AppService; dbPath: string }> {
  const tmp = await createTempDir()
  const dbPath = path.join(tmp.dir, 'kb.sqlite')
  const config: LoadedConfig = {
    configPath: path.join(tmp.dir, 'config.yaml'),
    database: { path: dbPath },
    sources: { path: testingPaths.minimal },
    display: { pageSize: 20 },
  }
  const app = new AppService(config)
  return { app, dbPath }
}
```

---

## Renderer (React) Tests

Use `@testing-library/react` + Happy-DOM global registrar.

```ts
// src/shell/renderer/components/entry-row.component.spec.tsx
import '@happy-dom/global-registrator'  // once per file or in preload
import { render, screen } from '@testing-library/react'
import { EntryRow } from './entry-row.component'

test('shows entry key', () => {
  render(<EntryRow entry={mockEntry} />)
  expect(screen.getByText(mockEntry.key)).toBeInTheDocument()
})
```

For components that call `rpc.*`, provide a thin stub via React context —
this is the **only** place where a controlled double is acceptable (the
real Eden Treaty client requires a running Elysia server).

```ts
// In tests: wrap with <RpcContext.Provider value={fakeRpc}>
const fakeRpc = {
  list: { get: async () => ({ data: [], error: null }) }
}
```

---

## Elysia RPC Server Tests

Use `app.handle(request)` — no real HTTP port needed:

```ts
import { createRpcServer } from '@rpc/server'
import { appFixture } from '@testing/helpers'

test('GET /list returns entries', async () => {
  const { app } = await appFixture()
  const server = createRpcServer(app)
  const res = await server.handle(new Request('http://localhost/list?limit=5'))
  expect(res.status).toBe(200)
  const body = await res.json()
  expect(Array.isArray(body)).toBe(true)
})
```

---

## Coverage Requirement

≥ 80% line coverage. Check with:

```bash
bun test --coverage
```

New code without tests will be flagged by the quality-gate skill.

---

## Gotchas

- Happy-DOM must be registered **before** any React imports in the test file.
  Put it at the top, or use a `preload` script in `bunfig.toml`.
- `drizzle-seed` generates deterministic data by default — pass a `seed` value
  for reproducible sequences: `seed(db, schema, { seed: 42 })`.
- `createTempDir()` returns `{ dir, cleanup }` — always call `await cleanup()`
  in `afterEach`, not `afterAll`, to prevent test pollution.
- Do not use `bun:test`'s `mock()` for module-level imports — prefer constructor
  injection so real implementations can be swapped at instantiation time.
- Renderer specs that test `rpc.*` side-effects must await the fake rpc promise
  and flush the React update queue: `await act(async () => { ... })`.
