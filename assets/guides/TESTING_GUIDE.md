---
title: Testing guidelines
description: Bun test runner, factories, table-driven tests, FCIS-friendly patterns
---

# Testing Guidelines

Cursor rule (detailed patterns): `.cursor/rules/testing.mdc`

## Bun: nested `describe` (no `context`)

`bun:test` exports **`describe`** (and `it`, `expect`, …) but **not** RSpec’s `context`. **Do not** alias (`const context = describe`); that adds noise. Use **nested `describe` blocks** for situation groups (“when …”, “with …”). Same structure as Better Specs “contexts”, one API only.

Project specs use **`it()`** for behavior examples. Bun also exposes
`test()`, but new and touched source specs should import and call `it()` so the
suite reads consistently with Better Specs examples. Convert existing
`test()` calls to `it()` during normalisation work unless the spec ledger
records a narrow exception.

## Core Principles

1. Write unit tests for all public functions and classes
2. Use table-driven tests for functions with multiple cases (reduces duplication)
3. Test edge cases: undefined values, empty inputs, boundary conditions
4. Test error paths explicitly (all error branches validated)
5. Use Bun's built-in test runner - no Jest, no Vitest
6. No mocking - use dependency injection with real implementations
7. Use in-memory SQLite (`:memory:`) for all DB tests - never the real DB
8. Keep tests minimal and focused (one behavior per test)
9. Achieve and maintain ≥80% code coverage

## ❌ Sparingly Use Mocking Policy

The codebase is designed around Dependency Injection. This means that we should avoid mocking unless absolutely necessary.

- **Never** use `mock()`, `spyOn()`, or module mocking for unit tests unless absolutely necessary
- Instantiate real adapters with an in-memory DB or test doubles
- If a piece of code is hard to test without mocking, it needs to be refactored

```typescript
// ✅ Correct - real SQLite in memory (paths illustrative — align with your module layout)
import { Database } from "bun:sqlite";
import { SQLiteRepository } from "../src/adapters/SQLiteRepository";

const db = new Database(":memory:");
const repo = new SQLiteRepository(db);

// ❌ Wrong - mocking the module
import { mock } from "bun:test";
mock.module("../src/adapters/SQLiteRepository", () => ({ ... }));
```

## Recommended Patterns

### Table-Driven Tests

```typescript
import { describe, expect, it } from "bun:test";
import { normalizeLinks } from "../src/domain/normalizeLinks";

describe("normalizeLinks", () => {
  const cases = [
    {
      name: "single URL string",
      input: "https://example.com",
      want: [{ title: "https://example.com", url: "https://example.com" }],
    },
    {
      name: "array of URLs",
      input: ["https://a.com", "https://b.com"],
      want: [
        { title: "https://a.com", url: "https://a.com" },
        { title: "https://b.com", url: "https://b.com" },
      ],
    },
    {
      name: "empty array",
      input: [],
      want: [],
    },
  ];

  for (const { name, input, want } of cases) {
    it(name, () => {
      expect(normalizeLinks(input)).toEqual(want);
    });
  }
});
```

### In-Memory SQLite Tests

```typescript
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { Database } from "bun:sqlite";
import { SQLiteRepository } from "../src/adapters/SQLiteRepository";

describe("SQLiteRepository", () => {
  let db: Database;
  let repo: SQLiteRepository;

  beforeEach(() => {
    db = new Database(":memory:");
    // Run schema migrations on the in-memory DB
    db.run(`CREATE TABLE IF NOT EXISTS knowledges ( ... )`);
    repo = new SQLiteRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  it("returns empty array when no entries exist", async () => {
    const result = await repo.find({ limit: 50, offset: 0 });
    expect(result.entries).toEqual([]);
    expect(result.total).toBe(0);
  });
});
```

### Error Path Testing

```typescript
import { expect, it } from "bun:test";
import { GetEntry } from "../src/application/usecases/GetEntry";

it("throws user error when entry not found", async () => {
  const usecase = new GetEntry(repo);
  await expect(usecase.execute(99999)).rejects.toMatchObject({
    exitCode: 1, // user error
  });
});
```

### Dependency Injection in Tests

```typescript
import { describe, it, expect } from "bun:test";
import { ActOnEntry } from "../src/application/usecases/ActOnEntry";
import { InMemoryClipboard } from "./helpers/InMemoryClipboard";

// Test double - a real implementation for tests, not a mock
class InMemoryClipboard implements Clipboard {
  public lastCopied: string | null = null;
  async copy(text: string) { this.lastCopied = text; }
}

describe("ActOnEntry", () => {
  it("copies command to clipboard for Command entries", async () => {
    const clipboard = new InMemoryClipboard();
    const usecase = new ActOnEntry(repo, clipboard, browser);

    await usecase.execute(commandEntryId);

    expect(clipboard.lastCopied).toBe("ls -la");
  });
});
```

### [Better Specs][3] Guidelines

Better Specs is a collection of best practices for writing high-quality tests. These guidelines should be followed for all test files in this project.

Better Specs is written for Rails/RSpec, so kb applies the intent through
Bun, TypeScript, React Testing Library, Fishery, and the `@testing` helpers
rather than copying RSpec APIs literally.

| Better Specs guideline   | kb adaptation                                                                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Describe methods         | Use `.` for class/static methods and `#` for instance methods where that distinction applies.                                        |
| Use contexts             | Use nested `describe` blocks; never alias `context`.                                                                                 |
| Short description        | Keep `describe` and `it` text under 40 characters; split with nested `describe`.                                                     |
| Single expectation       | Prefer one behavior assertion per unit example; allow grouped assertions for expensive integration setup.                            |
| All possible cases       | Cover valid, edge, invalid, empty, boundary, and error paths exposed by the public API.                                              |
| Expect vs should         | Use `expect(...)` from `bun:test`; never use Chai/Jest/RSpec `should` syntax.                                                        |
| Use subject              | Make the subject explicit with `subject`, `Subject`, `makeSubject()`, or `renderSubject()`; there is no Bun `subject()` API.          |
| Use let and let!         | Prefer local builders and lazy helpers; use `beforeEach` only for lifecycle setup that must be recreated per example.                |
| Mock or not to mock      | Prefer real implementations, dependency injection, and controlled test doubles; keep mocks narrow.                                   |
| Create the data you need | Build only the records needed for the behavior under test.                                                                           |
| Use factories            | Use `factoryFor` from `@testing`; reserve YAML fixtures for file-format import/sync integration.                                     |
| Easy-to-read matchers    | Prefer direct readable matchers over boolean expressions inside matchers.                                                            |
| Shared examples          | Prefer table-driven cases or local helper functions; avoid opaque shared-example abstractions.                                       |
| Test what you see        | Test pure domain logic deeply and user-visible renderer/RPC behavior through public surfaces.                                        |
| Do not use should        | Use present-tense behavior wording; never write descriptions that start with "should".                                               |
| Continuous testing       | Use `bun test --watch` or focused `bun test <path>` while iterating.                                                                 |
| Faster tests             | Keep core tests pure, DB tests in-memory, and preview e2e outside the default gate.                                                  |
| Stubbing HTTP requests   | Avoid real network calls; use injected fetch functions, `data:` URLs, `Bun.serve()` fixtures, or narrow mocks for external services. |
| Formatter                | Rely on Bun output plus focused paths locally; run the full quality gate before completion.                                          |

#### Core Principles

##### 1. Describe Your Methods

Be clear about what you are describing:
- Use `.` for TypeScript static methods and factory methods
- Use `#` for instance methods
- Use the exported function, component, hook, route, or module concept when the
  subject is not a class method

```typescript
// ✅ Good
describe('parseConfig', () => {
  // exported function tests
})

describe('ConfigLoader', () => {
  describe('.fromFile', () => {
    // static method tests
  })

  describe('#validate', () => {
    // instance method tests
  })
})

describe('EntryRow', () => {
  // React component tests
})

describe('useViewNavigation', () => {
  // hook tests
})

describe('POST /api/list', () => {
  // RPC route tests
})

// ❌ Bad
describe('create', () => {
  // unclear if this is a function, static method, or instance method
})
```

For files that export several related functions, either group by the module
concept and nest each exported subject, or make the dominant exported function
the top-level `describe`.

```typescript
// ✅ Good for a multi-export utility file
describe('window placement', () => {
  describe('centerBoundsInWorkArea', () => {})
  describe('resolveInitialFrame', () => {})
})

// ✅ Good when one function is the file's main subject
describe('centerBoundsInWorkArea', () => {})
```

Avoid vague subjects like `describe('utils')`, `describe('helpers')`, or
`describe('validation')` unless that phrase is the public concept a reader
would use to find the behavior.

##### 2. Use nested `describe` for situations

Nested groups make tests clear. Start inner `describe` names with 'when', 'with', or 'without'.

```typescript
// ✅ Good
describe('#destroy', () => {
  describe('when resource is found', () => {
    it('deletes the resource', () => {})
  })

  describe('when resource is not found', () => {
    it('returns 404', () => {})
  })
})

// ❌ Bad
describe('#destroy', () => {
  it('deletes the resource when found', () => {})
  it('returns 404 when not found', () => {})
})
```

##### 3. Put Context Setup in the Context

A BDD context is more than a label. When several examples share the same
situation, keep that situation's immutable setup inside the nested
`describe(...)` block so each `it(...)` can focus on one behavior.

Use this shape for pure functions and deterministic helpers:

```typescript
// ✅ Good
describe('centerBoundsInWorkArea', () => {
  describe('with a zero-origin work area', () => {
    const workArea = factoryFor('rectangle')
    const windowSize = factoryFor('windowSize')

    const frame = () => centerBoundsInWorkArea(workArea, windowSize)

    it('centers the window', () => {
      expect(frame()).toEqual({ x: 620, y: 330, width: 680, height: 420 })
    })

    it('preserves the requested size', () => {
      expect(frame()).toMatchObject({ width: 680, height: 420 })
    })
  })
})

// ❌ Bad
describe('centerBoundsInWorkArea', () => {
  describe('with a zero-origin work area', () => {
    it('centers the window', () => {
      const frame = centerBoundsInWorkArea(
        { x: 0, y: 0, width: 1920, height: 1080 },
        { width: 680, height: 420 }
      )
      expect(frame).toEqual({ x: 620, y: 330, width: 680, height: 420 })
    })
  })
})
```

Do not compute mutable or effectful results once in `describe(...)`, because
that state is shared across examples. For mutable setup, create fresh state in
`beforeEach(...)` or in a local `makeSubject()` helper:

```typescript
// ✅ Good when each example needs fresh mutable state
describe('TaskRepository', () => {
  describe('with an empty database', () => {
    let db: Database

    beforeEach(() => {
      db = createSeededMemoryDb({ entries: [] })
    })

    it('returns no tasks', () => {
      expect(findTasks(db)).toEqual([])
    })
  })
})
```

##### 4. Keep Descriptions Short

Spec descriptions should never be longer than 40 characters. If longer, split using another nested `describe`.

```typescript
// ✅ Good
describe('when authenticated', () => {
  it('returns user data', () => {})
})

// ❌ Bad
it('returns user data when the user is authenticated', () => {})
```

##### 5. Single Expectation Per Test

Each test should make only one assertion. This helps identify errors quickly and keeps code readable.

**Exception**: Integration tests that are slow to set up can have multiple expectations to avoid performance hits.

```typescript
// ✅ Good (unit test)
it('validates presence of name', () => {
  expect(user.validate()).toBe(false)
})

it('adds error message', () => {
  user.validate()
  expect(user.errors).toContain('Name is required')
})

// ✅ Acceptable (integration test with expensive setup)
it('creates user with all attributes', async () => {
  const user = await createUser()
  expect(user.id).toBeDefined()
  expect(user.name).toBe('John')
  expect(user.email).toBe('john@example.com')
})
```

##### 6. Test All Possible Cases

Test valid, edge, and invalid cases. Think of all possible inputs.

```typescript
describe('#destroy', () => {
  describe('when resource exists', () => {
    describe('when user owns resource', () => {
      it('deletes the resource', () => {})
    })

    describe('when user does not own resource', () => {
      it('returns 403 forbidden', () => {})
    })
  })

  describe('when resource does not exist', () => {
    it('returns 404 not found', () => {})
  })
})
```

##### 7. Make the Subject Explicit

Better Specs uses RSpec's `subject` to make the object under test obvious.
`bun:test` has no `subject()` API, but kb adopts the same intent: every spec
should make the tested surface easy to identify from the top of the file and
from each context.

Use this vocabulary:

- `subject` for imported modules, namespaces, or a single callable function.
- `Subject` for React components and classes that must stay PascalCase.
- `makeSubject()` for constructing an instance or service.
- `renderSubject()` for rendering a component.
- A context-specific action helper such as `frame()` or `submit()` when it
  reads clearer than calling the subject directly.

For a single exported function, alias the import to `subject` when that improves
the test shape:

```typescript
// ✅ Good: single exported function
import { centerBoundsInWorkArea as subject } from './placement.util'

describe('centerBoundsInWorkArea', () => {
  describe('with a zero-origin work area', () => {
    const workArea = factoryFor('rectangle')
    const windowSize = factoryFor('windowSize')

    const frame = () => subject(workArea, windowSize)

    it('centers the window', () => {
      expect(frame()).toEqual({ x: 620, y: 330, width: 680, height: 420 })
    })
  })
})
```

For cohesive multi-export modules, import the module namespace as `subject` and
nest exported functions under the module concept:

```typescript
// ✅ Good: cohesive multi-export utility module
import * as subject from './placement.util'

describe('window placement', () => {
  describe('centerBoundsInWorkArea', () => {
    it('centers the frame', () => {
      expect(
        subject.centerBoundsInWorkArea(
          factoryFor('rectangle'),
          factoryFor('windowSize')
        )
      ).toMatchObject({ x: 620, y: 330 })
    })
  })

  describe('resolveInitialFrame', () => {
    it('uses the saved frame', () => {
      expect(subject.resolveInitialFrame(savedFrame)).toEqual(savedFrame)
    })
  })
})
```

For components, keep the component name in the output and use `renderSubject`
for setup:

```tsx
// ✅ Good: React component
import { DependencyGraph as Subject } from './dependency_graph.component'

describe('DependencyGraph', () => {
  describe('when the task has dependencies', () => {
    const dependency = factoryFor('task', { overrides: { id: 1, key: 'setup-project' } })
    const task = factoryFor('task', { overrides: { dependsOn: [dependency.id] } })
    const entries = [dependency, task]

    const renderSubject = () =>
      render(
        <Subject
          entry={task}
          allEntries={entries}
          onSelectEntry={() => undefined}
        />
      )

    it('renders dependencies', () => {
      renderSubject()
      expect(screen.getByText('setup-project')).not.toBeNull()
    })
  })
})
```

Avoid specs where the tested object is only discoverable by reading every
assertion:

```typescript
// ❌ Bad: no clear subject, and two unrelated surfaces drift into one file
describe('helpers', () => {
  it('centers windows', () => {})
  it('parses config paths', () => {})
})
```

If `import * as subject from './file'` exposes unrelated exports, split the
production file or split the spec. A subject namespace is for cohesive modules,
not a way to hide mixed responsibilities.

##### 7.1 Prefer Local Builders Over Shared Mutable Setup

RSpec's `let` and `let!` map to simple TypeScript patterns in kb:

- Use `factoryFor(...)` for recurring project-owned shapes, including geometry
  and renderer props; see [FISHERY_GUIDE.md](./FISHERY_GUIDE.md).
- Use local constants inside an `it()` only when the setup is unique to one
  example.
- Use `const makeSubject = (...) => ...` when several examples need the same
  subject with small variations.
- Use `let subject: Type` plus `beforeEach` only when each example needs a fresh
  mutable object or lifecycle cleanup.
- Avoid top-level mutable fixtures shared between examples.

```typescript
// ✅ Good
describe('EntryPresenter', () => {
  const makeSubject = (entry = factoryFor('bookmark')) => new EntryPresenter(entry)

  it('returns the entry key', () => {
    expect(makeSubject().title()).toBe('https://example.com')
  })
})

// ✅ Good when lifecycle reset matters
describe('WindowStateStore', () => {
  let subject: WindowStateStore

  beforeEach(() => {
    subject = new WindowStateStore(':memory:')
  })

  it('starts empty', () => {
    expect(subject.load()).toBeNull()
  })
})
```

##### 8. Don't Use "should" in Descriptions

Use third person present tense. Describe what the code **does**, not what it **should do**.

```typescript
// ✅ Good
it('creates a new user', () => {})
it('validates email format', () => {})
it('returns 404 when not found', () => {})

// ❌ Bad
it('should create a new user', () => {})
it('should validate email format', () => {})
it('should return 404 when not found', () => {})
```

##### 9. Create Only the Data You Need

Don't load more data than needed. If you think you need dozens of records, you're probably wrong.

```typescript
// ✅ Good
it('finds user by email', () => {
  const user = createUser({ email: 'test@example.com' })
  expect(findByEmail('test@example.com')).toEqual(user)
})

// ❌ Bad
it('finds user by email', () => {
  const users = createUsers(100) // unnecessary data
  const user = users[0]
  expect(findByEmail(user.email)).toEqual(user)
})
```

##### 10. Use Factories and Local Builders

Use factories to reduce verbosity when creating kb test data. They are easier
to control than fixtures, and they keep domain records, renderer props, config
objects, RPC payloads, and geometry shapes aligned with real project types.

Keep **YAML fixtures** under `src/__tests__/fixtures/` for import/sync integration tests
that must read real files. See [FISHERY_GUIDE.md](./FISHERY_GUIDE.md).

- ❌ Bad: `fixtures` _(hard to customize)_

  ```typescript
  // ❌ Bad
  const user = fixtures.users.admin // fixtures
  ```

- ❌ Bad: `inline literals` _(hard to customize)_

  ```typescript
  describe('with a zero-origin work area', () => {
    const workArea = { x: 0, y: 0, width: 1920, height: 1080 }
    it('centers the window', () => {
      expect(workArea).toEqual({ x: 0, y: 0, width: 1920, height: 1080 })
    })
    it('preserves the requested size', () => {
      expect(workArea).toMatchObject({ width: 680, height: 420 })
    })
  })
  ```

- ✅ Good: `factories` _(easy to customize)_

  ```typescript
  import { factoryFor } from '@testing'

  describe('with a zero-origin work area', () => {
    const workArea = factoryFor('rectangle', { overrides: { x: 0, y: 0, width: 1920, height: 1080 } })
    it('centers the window', () => {
      expect(workArea).toEqual({ x: 0, y: 0, width: 1920, height: 1080 })
    })
    it('preserves the requested size', () => {
      expect(workArea).toMatchObject({ width: 680, height: 420 })
    })
  })
  ```

Choose the smallest setup abstraction that matches the data:

- Use `factoryFor(...)` for recurring project-owned shapes and exported types.
  Factories are defined in `src/__tests__/factories/factories.builder.ts` and
  accessed via the `factoryFor` helper. A factory entry is the single source of
  truth for each type's default shape and repeated scenarios.
- Promote local builders into factories when the same shape appears in another
  spec file or represents a stable project concept.
- Use inline literals only when the value is unique to one assertion and naming
  it would add noise.
- Do not use factories to hide the behavior under test. Override only the fields
  needed for the current context.
- Prefer a local `makeSubject(...)` or `renderSubject(...)` helper when several
  examples render the same component with small prop variations.

```typescript
// ✅ Good: project-shaped renderer data uses project factories
describe('DependencyGraph', () => {
  describe('when the task is blocked', () => {
    const dependency = factoryFor('task', {
      overrides: { id: 1, key: 'setup-project', status: 'done' }
    })
    const task = factoryFor('task', {
      overrides: { id: 2, key: 'review-pr', dependsOn: [1] }
    })

    const renderSubject = () =>
      render(
        <DependencyGraph
          entry={task}
          allEntries={[dependency, task]}
          onSelectEntry={() => undefined}
        />
      )

    it('renders the dependency', () => {
      renderSubject()
      expect(screen.getByText('setup-project')).not.toBeNull()
    })
  })
})

// ✅ Good: registered geometry factory
const workArea = factoryFor('rectangle', { width: 1920, height: 1080 })
const windowSize = factoryFor('windowSize')

// ❌ Bad: anonymous magic data hides what matters
render(<DependencyGraph entry={review} allEntries={[setup, review]} onSelectEntry={() => undefined} />)
```

Shared examples should be rare in TypeScript specs. Prefer table-driven cases or
small local helpers first. Introduce a shared behavior helper only when the same
observable contract repeats across multiple subjects and the helper keeps the
spec output clearer than explicit examples.

##### 11. Use Readable Matchers

Use clear, expressive matchers that make tests easy to understand.

```typescript
// ✅ Good
expect(user.name).toBe('John')
expect(users).toHaveLength(3)
expect(response.status).toBe(200)

// ❌ Bad
expect(user.name === 'John').toBe(true)
expect(users.length === 3).toBe(true)
```

Use `expect(...)` from `bun:test` for assertions. Do not use Chai/Jest/RSpec
`should` assertion syntax or add assertion libraries that compete with Bun.

##### 12. Mock Sparingly

Don't overuse mocks. Test real behavior when possible. Mocking makes specs faster but harder to maintain.

Use mocks for:
- External services (HTTP requests, third-party APIs)
- Slow operations (database queries in unit tests)
- Non-deterministic behavior (random values, timestamps)

Avoid mocks for:
- Internal application logic
- Simple functions
- Domain models

##### 13. Test What You See

Focus on:
- **Models**: Deep testing of business logic
- **Integration tests**: Test user-visible behavior
- **Controllers**: Minimal testing (covered by integration tests)

Don't add useless complexity testing controllers separately if integration tests cover the behavior.

##### 14. Share Behavior Carefully

Better Specs recommends shared examples to avoid duplicated controller specs.
In kb, prefer table-driven cases and small local helpers before introducing a
shared test abstraction. Shared helpers are useful when they keep behavior
obvious at the call site; they are harmful when a reader must jump between
files to understand the assertion.

```typescript
// ✅ Good
const cases = [
  { status: 'todo', expected: false },
  { status: 'done', expected: true }
] as const

for (const { status, expected } of cases) {
  it(`returns ${expected} for ${status}`, () => {
    expect(isComplete(status)).toBe(expected)
  })
}
```

##### 15. Stub HTTP Requests Explicitly

Specs must not call real external services. Prefer an injected `fetch`
function, a `data:` URL, or a local `Bun.serve()` fixture. Use `mock()` only for
external services or non-deterministic behavior that cannot be made local.

```typescript
// ✅ Good
const fetchJson = async () => new Response('{"ok":true}')
await expect(loadRemoteConfig(fetchJson)).resolves.toEqual({ ok: true })

// ❌ Bad
await loadRemoteConfig(fetch) // reaches the real network
```

##### 16. Keep the Feedback Loop Fast

Use focused commands while iterating:

```bash
bun test src/shell/app/
bun test src/shell/main/window/placement.util.spec.ts
bun test --watch
```

Before completion, run the repository quality gate. Preview e2e stays opt-in
for renderer-risky work because it is slower and requires browser setup.

#### Project-Specific Guidelines

##### TypeScript/Bun Testing

```typescript
import { describe, it, expect, beforeEach } from 'bun:test'

describe('DocumentValidator', () => {
  let subject: DocumentValidator

  beforeEach(() => {
    subject = new DocumentValidator()
  })

  describe('#validate', () => {
    describe('when document is valid', () => {
      it('returns true', () => {
        expect(subject.validate(validDoc)).toBe(true)
      })
    })

    describe('when document is invalid', () => {
      it('returns false', () => {
        expect(subject.validate(invalidDoc)).toBe(false)
      })

      it('adds error message', () => {
        subject.validate(invalidDoc)
        expect(subject.errors).toContain('Invalid format')
      })
    })
  })
})
```

#### Summary Checklist

- [ ] Use `.` for class methods, `#` for instance methods in descriptions
- [ ] Use nested `describe` names starting with 'when', 'with', or 'without'
- [ ] Keep descriptions under 40 characters
- [ ] One expectation per test (except slow integration tests)
- [ ] Test valid, edge, and invalid cases
- [ ] Make the subject explicit with `subject`, `Subject`, `makeSubject()`, or
      `renderSubject()` when it improves clarity
- [ ] Prefer local builders over shared mutable setup
- [ ] **Never use "should" in test descriptions**
- [ ] Use `expect(...)` assertions from `bun:test`
- [ ] Use third person present tense
- [ ] Create only necessary test data
- [ ] Use factories instead of fixtures
- [ ] Use readable matchers
- [ ] Mock sparingly, test real behavior
- [ ] Avoid real external HTTP calls
- [ ] Prefer table-driven cases or local helpers over opaque shared examples
- [ ] Use focused `bun test <path>` or `bun test --watch` while iterating
- [ ] Focus on models and integration tests

### BDD Style for Source Specs

Write specs as behavior documentation.

- `describe('<subject>')` names the public unit or user-visible surface.
- nested `describe('when/with/without ...')` names the relevant context.
- `it('<observable outcome>')` names what the system does.
- `subject`, `Subject`, `makeSubject()`, or `renderSubject()` identifies the
  tested object or action when the file would otherwise be ambiguous.
- Prefer user-visible or public API behavior over implementation details.
- Avoid examples named after internal steps, private helpers, or setup mechanics.

## Enforcement

`mise run test:spec-audit` checks co-located spec coverage only. Better Specs
style is currently enforced by review, the normalise-specs ledger, and the
quality gate's existing lint/type/test checks. Add an explicit ast-grep or
audit guard only after a manual cleanup proves the rule has low false-positive
risk.

## File Structure

Tests live next to the source files they test:

```
src/
  domain/
    normalizeLinks.ts
    normalizeLinks.spec.ts
  adapters/
    SQLiteRepository.ts
    SQLiteRepository.spec.ts
  application/
    usecases/
      GetEntry.ts
      GetEntry.spec.ts
```

## Running Tests

```bash
# All tests
bun run test

# Watch mode
bun run test:watch
```

## Shared test helpers (`@testing`)

`tsconfig.json` maps **`@testing`** to [`src/__tests__/index.ts`](../../src/__tests__/index.ts).
Use it for Fishery factories, fixture paths, temp dirs, and seeded in-memory DBs.

| Export                                                                    | Role                                                                            |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `factoryFor`                                                              | Typed defaults for `Env`, `RawConfig`, `LoadedConfig`, geometry, and `Knowledge` variants |
| `testingPaths`, `minimalEntriesYml`                                       | Absolute paths under `src/__tests__/fixtures/`                                  |
| `createSeededMemoryDb`, `seedMinimalFixture`, `readMinimalFixtureEntries` | Minimal YAML → `:memory:` SQLite + FTS                                          |
| `createTempDir`                                                           | `mkdtemp` + `cleanup()` for disk-backed integration                             |
| `createFactoryFor`                                                        | Low-level wrapper when you add a new factory module                             |

Keep DB specs on **`:memory:`** and avoid mocks for internal code; see [Definition of Done](./DoD.md).

For Fishery details and advanced APIs (`create`, `onCreate`, traits), see [FISHERY_GUIDE.md](./FISHERY_GUIDE.md).

## Spec-audit task

Every production file under `src/` requires a co-located `.spec.ts` or
`.spec.tsx`. The following categories are **exempt** from this rule:

- **Barrel re-exports** (`index.ts`, `shared.ts`)
- **Pure type-only modules** (`.types.ts`, `.d.ts`)
- **Constants modules** (`.const.ts`)
- **Schema-only modules** (`.schema.ts`, `.schemas.ts`)
- **Generated or fixture data** (`__tests__/fixtures/`, `generated`)
- **Guard modules** (`.guard.ts`)

Use `mise run test:spec-audit` to list non-exempt source files that lack
a co-located spec. The default mode is report-only (exits `0`). Add `--strict`
to exit non-zero when missing specs exist.

## Preview e2e workflow

`mise run e2e:preview` runs Playwright tests against the preview server.
It requires Chromium (install once with `bun run e2e:preview:install`) and
a useful preview database. It is intentionally **not** part of the default
quality gate for speed and portability.

**When to run:**

- Changes touching list navigation, filters, task sheet, or preview tooling
- Renderer component refactors with structural changes

**Reporting:** Include `mise run e2e:preview` results in the implementation
notes. If it cannot run, report the exact blocker (missing Chromium, empty
preview database, port conflict) rather than treating the default gate as
equivalent coverage.

A maintainer-triggered CI workflow for preview e2e may be added later, but
the default gate must remain fast and portable.

## References

- [Bun Test Runner][0]
- [Bun Test Matchers][1]
- [Dependency Injection pattern][2]
- [Better Specs Guide][3]
- [Fishery factories in kb](./FISHERY_GUIDE.md)

[0]: https://bun.sh/docs/test 'Bun Test Runner'
[1]: https://bun.sh/docs/test/writing 'Bun Test Matchers'
[2]: https://en.wikipedia.org/wiki/Dependency_injection 'Dependency Injection pattern'
[3]: https://betterspecs.org 'Better Specs Guide'
