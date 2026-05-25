---
name: app-testing
description: >
  Use when writing or modifying any test in this codebase — unit specs,
  integration specs, renderer component specs, Elysia RPC handler tests, or
  pure FCIS core/domain specs. Triggers on: adding a function/component
  without a co-located spec, fixing a flaky test, lowering coverage,
  choosing a fixture pattern, debugging a test that needs `await` or
  `beforeEach` for code that should be pure. Load it even for small fixes —
  wrong patterns (mocking AppService, real SQLite files, real HTTP ports,
  factories where domain validation matters) compound fast.
---

# App Testing Conventions

## Overview

Three guides govern testing in this repo. They are the source of truth — if
this skill ever disagrees, the guides win:

- [`assets/guides/TESTING_GUIDE.md`](../../../assets/guides/TESTING_GUIDE.md) — Bun
  test runner, Better Specs conventions, no-mock rule.
- [`assets/guides/FISHERY_GUIDE.md`](../../../assets/guides/FISHERY_GUIDE.md) — typed
  factories via `factoryFor` from the `@testing` alias.
- [`assets/guides/FCIS.guide.md`](../../../assets/guides/FCIS.guide.md) — pure
  core specs: no setup, no mocks, no async.

The test contract in one sentence: **`bun:test` only, co-located specs,
real implementations with controlled inputs, factories from `@testing`,
in-memory SQLite, ≥ 80% coverage.**

## Runner

```bash
bun test                   # all specs
bun test --watch           # watch mode
bun test src/shell/app/    # subset
bun test --coverage        # coverage report
```

Use `bun:test` exclusively — never Jest, Vitest, or Mocha.

### Terminal output

`bunfig.toml` sets `[test] onlyFailures = true`, so the terminal shows **summary
only** when all tests pass (failures still print in full). This avoids long
`describe > describe > it` breadcrumb lines — not duplicate runs.

`testing.quiet_stdio.ts` is preloaded after Happy DOM: it configures Logtape with
a noop sink (meta at `fatal`) and replaces `console.log` / `warn` / `error` /
etc. with no-ops so LogTape startup lines, React `act(...)` hints, and unknown
element warnings never pollute the terminal. Specs that reconfigure Logtape
(e.g. `console.logger.spec.ts`) must call `configureQuietLogtape()` from
`@testing` in `afterEach`, not `configureSync({ sinks: {}, loggers: [] })`.

- **VS Code / Cursor Testing panel** — hierarchical tree; use it when you want
  per-test names without noisy terminal output.
- **Verbose terminal names** — temporarily remove `onlyFailures` from
  `bunfig.toml`, or rely on the Testing panel; Bun has no `--no-only-failures`
  flag.
- **CI** — `bun run test:ci` adds JUnit XML (`--reporter=junit`) regardless of
  `onlyFailures`.

## File location & naming

Co-locate every spec next to its source. Suffix follows
[`assets/guides/CODESTYLE_GUIDE.md`](../../../assets/guides/CODESTYLE_GUIDE.md)
§Test files (machine-checked by ls-lint):

| Source file                             | Spec file                                    |
| --------------------------------------- | -------------------------------------------- |
| `src/shell/app/app.service.ts`          | `src/shell/app/app.service.spec.ts`          |
| `src/shell/renderer/list.page.tsx`      | `src/shell/renderer/list.page.spec.tsx`      |
| `src/core/domain/guards/entry.guard.ts` | `src/core/domain/guards/entry.guard.spec.ts` |
| `src/shared/utils/crc32.util.ts`        | `src/shared/utils/crc32.util.spec.ts`        |
| End-to-end                              | `<name>.e2e.spec.ts`                         |

Role suffixes survive into the spec name (`use_list_selection.hook.spec.tsx`,
`task_state.util.spec.ts`). Plain `.test.ts` is **banned**.

## Better Specs conventions

[`TESTING_GUIDE.md`](../../../assets/guides/TESTING_GUIDE.md) §Better Specs is
the canonical list; the rules that bite most often:

| Rule                                             | Example                                                |
| ------------------------------------------------ | ------------------------------------------------------ |
| `.` for class methods, `#` for instance methods  | `describe('.create')`, `describe('#validate')`         |
| Inner `describe` starts with "when/with/without" | `describe('when resource is found', …)`                |
| Description ≤ 40 characters                      | `it('returns user data')` — split with nested describe |
| Never use "should" / present tense, third person | `it('creates a new user')`, not `it('should create…')` |
| One expectation per unit test                    | Multiple expectations only in slow integration tests   |
| Test valid + edge + invalid cases                | `when found / when not found / when forbidden`         |
| Use factories, not fixtures                      | `factoryFor('bookmark', { overrides: … })`             |
| Use readable matchers                            | `toHaveLength(3)` not `length === 3`                   |

## Table-driven tests

The canonical project shape (matches `TESTING_GUIDE.md` §Recommended Patterns):

```ts
import { describe, it, expect } from 'bun:test'
import { normalizeLinks } from './normalize_links.parser'

describe('normalizeLinks', () => {
  const cases = [
    { name: 'single URL string', input: 'https://example.com',
      want: [{ title: 'https://example.com', url: 'https://example.com' }] },
    { name: 'array of URLs', input: ['https://a.com', 'https://b.com'],
      want: [
        { title: 'https://a.com', url: 'https://a.com' },
        { title: 'https://b.com', url: 'https://b.com' }
      ] },
    { name: 'empty array', input: [], want: [] }
  ]

  for (const { name, input, want } of cases) {
    it(name, () => {
      expect(normalizeLinks(input)).toEqual(want)
    })
  }
})
```

Use `it.each([...])` only when the input/output shape is identical across
rows; otherwise prefer the `for` loop pattern above for readability.

## No-mock rule

[`TESTING_GUIDE.md`](../../../assets/guides/TESTING_GUIDE.md) §❌ Sparingly Use
Mocking Policy: never use `mock()`, `spyOn()`, or `mock.module()` for
internal code. The codebase is built around dependency injection.

| Instead of mocking…     | Do this instead                                |
| ----------------------- | ---------------------------------------------- |
| `AppService`            | Instantiate with an in-memory DB fixture       |
| SQLite DB               | `new Database(':memory:')` + factories         |
| File system             | `createTempDir()` from `@testing`              |
| `fetch` / network       | `data:` URIs or a local `Bun.serve()` fixture  |
| Clipboard / OS adapters | A real test-double class implementing the port |

Acceptable mock targets (TESTING_GUIDE §11): external HTTP services, slow
operations a unit test must skip, non-deterministic behavior (random
values, timestamps).

## Test fixtures — Fishery factories

### Fishery `factoryFor` (domain rows)

[`FISHERY_GUIDE.md`](../../../assets/guides/FISHERY_GUIDE.md) is the canonical
reference. Use this for `Knowledge` variants (bookmark/command/cheat/task),
`Env`, `RawConfig`, `LoadedConfig`, and any other typed object that must
satisfy domain validation. The repo does **not** use `drizzle-seed` (see
[`assets/docs/specs/foundation/design.md`](../../../assets/docs/specs/foundation/design.md)
Decision 4).

```ts
import { factoryFor } from '@testing'

const row = factoryFor('bookmark', { overrides: { desc: 'admin flow' } })
const cfg = factoryFor('loadedConfig', {
  overrides: { display: { pageSize: 5 } }
})
const trio = factoryFor('bookmark', { overrides: { tags: ['x'] } }) // single
const list = Array.from({ length: 3 }, () => factoryFor('bookmark'))  // many
```

The wrapper accepts either a plain partial OR
`{ overrides?, associations?, transient?, afterBuild? }`. Defaults are
declared in `src/__tests__/factories/factories.builder.ts`.

## In-memory SQLite via `@testing`

`@testing` (mapped in `tsconfig.json` to `src/__tests__/index.ts`) re-exports
the canonical helpers:

| Export                      | Role                                                                |
| --------------------------- | ------------------------------------------------------------------- |
| `factoryFor`                | Typed factories for `Knowledge`, `Env`, `RawConfig`, `LoadedConfig` |
| `testingPaths`              | Absolute paths under `src/__tests__/fixtures/`                      |
| `minimalEntriesYml`         | Path to the minimal YAML import fixture                             |
| `createSeededMemoryDb`      | `:memory:` `bun:sqlite` handle seeded from minimal YAML + FTS       |
| `seedMinimalFixture`        | Upsert minimal YAML rows on an existing `DbHandle`                  |
| `readMinimalFixtureEntries` | Parse minimal YAML to entries (no DB)                               |
| `createTempDir`             | `mkdtemp` + `cleanup()` for disk-backed integration                 |
| `createFactoryFor`          | Low-level builder when adding a new factory module                  |

```ts
import { afterEach, beforeEach, describe, it, expect } from 'bun:test'
import { findAll } from '@shell/app/db/entry.repository'
import { createSeededMemoryDb } from '@testing'

describe('Seeded DB', () => {
  let handle: Awaited<ReturnType<typeof createSeededMemoryDb>>

  beforeEach(async () => {
    handle = await createSeededMemoryDb()
  })
  afterEach(() => handle.raw.close(true))

  it('loads minimal fixture rows', () => {
    expect(findAll(handle.raw)).toHaveLength(4)
  })
})
```

## AppService fixture

```ts
import { AppService } from '@app/app.service'
import { factoryFor, createTempDir } from '@testing'
import path from 'node:path'

async function appFixture() {
  const tmp = await createTempDir()
  const config = factoryFor('loadedConfig', {
    overrides: {
      configPath: path.join(tmp.dir, 'config.yaml'),
      database:   { path: path.join(tmp.dir, 'kb.sqlite') }
    }
  })
  const app = new AppService(config)
  return { app, cleanup: tmp.cleanup }
}
```

Always `await cleanup()` in `afterEach` (not `afterAll`) to prevent test
pollution between cases.

## Renderer (React) tests — Happy-DOM + Testing Library

```ts
// src/shell/renderer/components/list/entry_row.component.spec.tsx
import '@happy-dom/global-registrator'
import { describe, it, expect } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { factoryFor } from '@testing'
import { EntryRow } from './entry_row.component'

describe('EntryRow', () => {
  describe('when entry is a bookmark', () => {
    it('shows the entry key', () => {
      const entry = factoryFor('bookmark')
      render(<EntryRow entry={entry} />)
      expect(screen.getByText(entry.key)).toBeInTheDocument()
    })
  })
})
```

For components that call `rpc.*`, wrap with a controlled `RpcContext` stub —
this is the **only** acceptable controlled double, because the real Eden
Treaty client requires a running Elysia server:

```tsx
const fakeRpc = { list: { get: async () => ({ data: [], error: null }) } }
render(
  <RpcContext.Provider value={fakeRpc}>
    <ListPage />
  </RpcContext.Provider>
)
```

For asynchronous side-effects, await `act` to flush React's update queue:

```tsx
import { act } from '@testing-library/react'
await act(async () => { /* trigger rpc-driven update */ })
```

## Elysia RPC tests — `server.handle()`, no real port

```ts
import { describe, it, expect } from 'bun:test'
import { createRpcServer } from '@rpc/server'
import { appFixture } from '@testing'

describe('GET /list', () => {
  it('returns entries', async () => {
    const { app } = await appFixture()
    const server = createRpcServer(app)
    const res = await server.handle(new Request('http://localhost/list?limit=5'))
    expect(res.status).toBe(200)
    expect(Array.isArray(await res.json())).toBe(true)
  })
})
```

`server.handle()` exercises the same routes the real HTTP listener would,
without binding a port — fast, parallel-safe, no flakes.

## FCIS core specs — no setup, no mocks, no async

[`FCIS.guide.md`](../../../assets/guides/FCIS.guide.md) §Testing: pure-core
tests are the simplest tests in the repo. The litmus test:

> If a test for code in `src/core/` needs `beforeEach`, `afterEach`,
> `await`, or a mock, the function under test is in the **wrong layer**.

```ts
import { describe, it, expect } from 'bun:test'
import { isOverdue } from './task.rule'

describe('isOverdue', () => {
  const NOW = new Date('2026-06-01T00:00:00Z')

  describe('when due is in the past', () => {
    it('returns true for non-done tasks', () => {
      expect(isOverdue({ status: 'todo', dueAt: new Date('2026-05-01') }, NOW))
        .toBe(true)
    })

    it('returns false for done tasks', () => {
      expect(isOverdue({ status: 'done', dueAt: new Date('2026-05-01') }, NOW))
        .toBe(false)
    })
  })
})
```

Pass `now` in as a parameter — never call `new Date()` inside core code.

## Coverage requirement

≥ 80% line coverage on changed files (DoD §2):

```bash
bun test --coverage
```

Coverage only instruments imported files; orphan source files won't appear
even when uncovered. Inspect the file list, don't trust the percentage
alone. New code without a co-located spec is flagged by **app-quality-gate**
and blocks the gate.

## Common Mistakes

| Failure                                      | Likely cause                          | Fix                                                   |
| -------------------------------------------- | ------------------------------------- | ----------------------------------------------------- |
| Test needs `await` for `src/core/` code      | Code does I/O — wrong layer           | Move I/O to `src/shell/`; pass results in             |
| `bun:test` cannot find `mock.module`         | Trying to mock internal code          | Use DI + a real test double class                     |
| Real SQLite file persists between tests      | Forgot `:memory:`                     | `new Database(':memory:')` always                     |
| Coverage drops on a renderer change          | Forgot the spec file                  | Add `<name>.component.spec.tsx` next to source        |
| `it('should …')` triggers TESTING_GUIDE rule | Using "should" / future tense         | Rewrite in present tense, third person                |
| Description > 40 chars                       | Single sentence trying to do too much | Split into nested `describe`                          |
| Multiple `expect` in a unit test             | One test verifying many properties    | One per test (group via nested `describe` blocks)     |
| Spec ends in `.test.ts`                      | Wrong suffix                          | Rename to `.spec.ts(x)` — ls-lint will fail otherwise |
| Mocked AppService in a route test            | Trying to skip DB setup               | `appFixture()` from `@testing` — fast, real, no port  |
| Renderer spec misses `act` for rpc calls     | Forgot to flush React queue           | `await act(async () => { … })`                        |

## Gotchas

- `@happy-dom/global-registrator` must be registered **before** any React
  imports in the test file. Put it at the top, or use a `preload` script in
  `bunfig.toml` so it applies repo-wide.
- Fishery sequences are per-factory and per-process. If a spec depends on
  exact id values, call `rewindSequence()` from Fishery in `beforeEach`.
- `createTempDir()` returns `{ dir, cleanup }` — always `await cleanup()`
  in `afterEach`, not `afterAll`, or pollution between cases creeps in.
- Do not use `bun:test`'s `mock()` for module-level imports — refactor to
  constructor injection so real implementations swap at instantiation time.
- For Elysia routes, validate with `t.*` (TypeBox), not Zod. Zod stays in
  `src/core/` for domain invariants.
- `factoryFor('knowledge', …)` returns a union — narrow with the type
  discriminator before asserting type-specific fields.
