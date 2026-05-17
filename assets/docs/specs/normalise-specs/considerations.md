<!-- markdownlint-disable-file -->
# TESTING_GUIDE.md evaluation

## Strengths

- **Principles are sound.** `bun:test` only, dependency injection, in-memory SQLite, co-located specs, factories over fixtures — no disagreement on any rule.
- **Better Specs adaptation is pragmatic.** `context` → nested `describe`, `let` → `const makeX`, `subject` → thunks, `FactoryBot` → `factoryFor`. We map intent, not syntax.
- **The coverage bar is real.** `>= 80%` on changed files, enforced by the quality gate. Not aspirational.
- **`factoryFor` as the primary data path is newly explicit.** Recurring project-owned shapes flow through `factories.builder.ts`. Local builders remain acceptable for one-file incidental values that are not stable project concepts yet.
- **Table-driven tests are documented** with the `for (const { name, input, want } of cases)` pattern, which is the correct bun:test idiom.

## Friction for agents

### 1. Defensive framing

The guide opens with what we DON'T do: no `context` keyword, no `let`, no `should`, no RSpec, no Jest, no Vitest, no fixtures, no mocks, no ad-hoc scripts. An agent reading cold gets a list of prohibitions before a clear picture of the desired shape. Move the positive pattern first, prohibitions second.

### 2. "Core Principles" listed in two places

Lines 20-31 (numbered list) and lines 190-600 (detailed sections with code examples). An agent who reads only the top list misses the detailed guidance. An agent who scrolls past the list to the code assumes the list was the summary. Consolidate into one place.

### 3. Context setup examples contradict the factory policy

Section "3. Put Context Setup in the Context" used to show inline object literals like `{ x: 0, y: 0, width: 1920, height: 1080 }`. The guide now uses registered factories such as `factoryFor('rectangle')` and `factoryFor('windowSize')` for recurring geometry shapes.

### 4. No single canonical example

There's no section that answers "what does a complete, correct test look like?" in one place. The patterns are spread across:
- § Table-Driven Tests (pure function)
- § In-Memory SQLite Tests (DB setup)
- § Error Path Testing (async rejection)
- § Put Context Setup in the Context (BDD structure)
- § Use Factories and Local Builders (data setup)

An agent must synthesize from five sections. A single annotated example at the top — showing subject → nested describe → factoryFor → action helper → short it() → one assertion — would reduce synthesis time to zero.

### 5. RSpec mapping table is noise for TypeScript-native agents

Lines 168-188 map every Better Specs guideline to the kb equivalent. This is useful for maintainers transitioning from Rails, but noise for agents who never wrote RSpec. Consider moving it to a collapsible appendix or a separate migration doc.

### 6. `let`/`beforeEach` guidance is scattered

Three different sections discuss mutable vs immutable setup, `beforeEach`, local builders, and `factoryFor`. An agent deciding "where do I put my test data?" has to read §6, §7.1, §8, and §10 to form a complete answer.

## Suggested changes (in priority order)

1. **Add a "Canonical Test Shape" section near the top.** One complete, annotated example of a pure function spec with table-driven cases, one of a hook spec, and one of a Renderer component spec. Each showing: subject describe, nested context, `factoryFor`, action helper, short `it()`, one assertion. This is now tracked by Phase 13 in `tasks.md`.

2. **Fix the context setup example to use `factoryFor`.** Replace inline `{ x, y, width, height }` literals in §3 with registered geometry factories such as `factoryFor('rectangle')` and `factoryFor('windowSize')`.

3. **Consolidate "Core Principles"** into one list with brief explanations, keeping the detailed code sections as reference.

4. **Move the RSpec mapping table** to the end of the guide as an appendix or hide it behind a `<details>` block with summary text like "Mapping from RSpec/Better Specs (for reference)."

5. **Add a "Test data decision tree"** that answers the question in one place: "Where do I put test data?" — `factoryFor` for recurring project-owned shapes and scenarios → local builder for one-file incidental values → inline literal only if unique to one assertion and naming adds noise → `beforeEach` only for mutable state needing lifecycle reset.

## Follow-up decisions recorded

- Adopt the Better Specs `subject` concept as an explicit-subject convention,
  not as an RSpec API. Use `subject`, `Subject`, `makeSubject()`,
  `renderSubject()`, or a context-specific action helper when it makes the
  tested object or action obvious.
- Use `import * as subject from './module'` only for cohesive multi-export
  modules. Split the spec or record a production split follow-up when a module
  exposes unrelated exports.
- Keep Fishery as the primary path for recurring project-owned data, including
  domain records, config, RPC payloads, renderer props, geometry, display/window
  data, typed events, and scenario variants.
