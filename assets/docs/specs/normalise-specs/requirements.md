<!-- markdownlint-disable-file -->
# Normalise source specs — Requirements

## Introduction

The repository already has a detailed testing policy in
[`assets/guides/TESTING_GUIDE.md`](../../../guides/TESTING_GUIDE.md), but the
source spec suite has grown through many feature phases. This spec defines a
safe, incremental plan to normalise `*.spec.ts`, `*.spec.tsx`, and
`*.e2e.spec.ts` files so they consistently follow the guide without changing
product behavior.

The implementation must be conservative: test semantics come first, style comes
second. If a spec requires a larger production refactor to avoid a mock or
fixture, the implementer records the finding and leaves that refactor to a
separate feature phase.

## Out of scope

- Rewriting production behavior solely to make tests prettier.
- Adding Jest, Vitest, or a second test runner.
- Moving accepted YAML import/sync fixtures out of `src/__tests__/fixtures/`.
- Making Playwright preview e2e part of the default quality gate.
- Enforcing every rule with new lint tooling before the manual cleanup is done.

## Requirement syntax

- **WHEN** _event_, **THEN** the system **SHALL** _response_.
- **IF** _precondition_, **THEN** the system **SHALL** _response_.

## Requirement NS-1: Spec inventory and classification

### Acceptance criteria

1. WHEN the normalisation work starts, THEN the implementer SHALL inventory all
   `src/**/*.spec.ts`, `src/**/*.spec.tsx`, and `src/**/*.e2e.spec.ts` files.
2. WHEN a spec file is inventoried, THEN the implementer SHALL classify it by
   layer: core, shared, shell app, shell main, shell renderer, or test helper.
3. WHEN a spec file is inventoried, THEN the implementer SHALL record which
   testing-guide categories apply to it: Bun API usage, description style,
   mocking, database setup, factories or fixtures, table-driven cases, readable
   matchers, and error-path coverage.
4. IF a spec intentionally diverges from the testing guide, THEN the
   implementer SHALL record the reason in this spec's task ledger instead of
   silently preserving the divergence.

## Requirement NS-2: Bun test API consistency

### Acceptance criteria

1. WHEN a source spec imports test APIs, THEN it SHALL import from `bun:test`.
2. WHEN a source spec defines behavior examples, THEN it SHALL use `it()` and
   SHALL NOT use `test()` unless the task ledger records a narrow exception.
3. WHEN a source spec groups situations, THEN it SHALL use nested `describe`
   blocks and SHALL NOT alias or import `context`.
4. WHEN a source spec contains executable examples, THEN it SHALL group them
   under a subject `describe` block unless the task ledger records why a
   single-example helper or pointer spec is clearer without one.
5. WHEN a source spec names a subject `describe`, THEN it SHALL use the public
   exported subject: exported function, class, React component, hook, RPC route,
   or clear module concept.
6. WHEN a source spec describes class members, THEN it SHALL use `.` for
   TypeScript static or factory methods and `#` for instance methods.
7. WHEN a source spec covers a multi-export utility module, THEN it SHALL either
   group by a clear module concept with nested exported subjects or make the
   dominant exported function the top-level `describe`.
8. WHEN a source spec describes expected behavior, THEN descriptions SHALL use
   present-tense behavior wording and SHALL NOT use "should".
9. IF a source spec would use a vague subject such as "utils", "helpers", or
   "validation", THEN the task ledger SHALL record why that phrase is the
   public concept a reader would use to find the behavior.
10. WHEN a source spec's subject would otherwise be ambiguous, THEN it SHALL use
    an explicit `subject`, `Subject`, `makeSubject()`, `renderSubject()`, or
    context-specific action helper to identify the object or action under test.
11. WHEN a source spec imports a cohesive multi-export module as
    `import * as subject`, THEN nested `describe` blocks SHALL name the exported
    functions or public module surfaces under test.
12. IF `import * as subject` exposes unrelated exports, THEN the implementer
    SHALL split the spec or record the production-file split as a follow-up
    instead of hiding mixed responsibilities behind one subject namespace.

## Requirement NS-3: Focused and readable assertions

### Acceptance criteria

1. WHEN a unit spec validates behavior, THEN each test SHALL prefer one primary
   behavior assertion.
2. IF a setup is integration-heavy or intentionally expensive, THEN the spec MAY
   keep multiple related expectations in one test and SHALL record that reason
   in the phase summary when touched.
3. WHEN a spec uses boolean expressions inside matchers, THEN it SHALL replace
   them with readable matchers such as `toBe`, `toEqual`, `toHaveLength`,
   `toContain`, or `toMatchObject`.
4. WHEN a function has several equivalent input cases, THEN the spec SHALL use
   table-driven cases unless the table would obscure the behavior.

## Requirement NS-4: Mocking and dependency boundaries

### Acceptance criteria

1. WHEN a spec tests internal project logic, THEN it SHALL prefer dependency
   injection, real lightweight adapters, or explicit test doubles over
   `mock()`, `spyOn()`, or module mocking.
2. IF a mock is still required for external, slow, or non-deterministic behavior,
   THEN the spec SHALL keep the mock narrow and local to the test.
3. WHEN avoiding a mock requires production design changes outside the current
   phase, THEN the implementer SHALL document the follow-up and SHALL NOT make
   unrelated production refactors.

## Requirement NS-5: Database and fixture discipline

### Acceptance criteria

1. WHEN a spec needs SQLite, THEN it SHALL use an in-memory `:memory:` database
   or the shared `@testing` helpers that create one.
2. WHEN a spec needs recurring project-owned test data, THEN it SHALL prefer
   `factoryFor` or dedicated builders from `@testing`.
3. IF a spec reads YAML fixtures, THEN it SHALL only do so for import, sync, or
   file-format integration behavior that must exercise real files under
   `src/__tests__/fixtures/`.
4. WHEN a spec creates test data, THEN it SHALL create only the records needed
   for the behavior under test.
5. WHEN a local builder is reused across spec files or represents a stable
   project concept, THEN it SHALL be promoted to the Fishery registry unless the
   task ledger records a concrete reason not to do so.
6. WHEN a factory represents a recurring scenario, THEN it SHALL use a named
   variant, transient data, associations, or `afterBuild` instead of repeated
   ad hoc override blocks.

## Requirement NS-6: Error and edge-path coverage

### Acceptance criteria

1. WHEN a touched unit has valid, invalid, empty, undefined, boundary, or error
   behavior already exposed by the public API, THEN its spec SHALL cover those
   cases or record a concrete reason why the case is not applicable.
2. WHEN a touched async path can reject or return an error response, THEN the
   spec SHALL assert the rejection or error shape directly.
3. WHEN a touched renderer interaction has keyboard, focus, or ARIA behavior,
   THEN the spec SHALL dispatch events through the same surface the production
   code uses whenever possible.

## Requirement NS-7: Co-location and coverage contract

### Acceptance criteria

1. WHEN the normalisation pass changes source coverage expectations, THEN it
   SHALL preserve the repository's co-located spec contract.
2. WHEN `mise run test:spec-audit` exists, THEN the implementer SHALL run it
   and record the result in the task ledger.
3. WHEN a production file is discovered without a required co-located spec, THEN
   the implementer SHALL either add the focused spec in the relevant phase or
   record the existing exemption category from `TESTING_GUIDE.md`.

## Requirement NS-8: Incremental implementation and verification

### Acceptance criteria

1. WHEN a phase modifies specs, THEN it SHALL run focused `bun test` commands
   for the touched directories before running broader checks.
2. WHEN a phase completes, THEN it SHALL run the full quality gate before commit.
3. WHEN a phase is too large, THEN the implementer SHALL split it by layer and
   update `tasks.md` before continuing.
4. IF test behavior is ambiguous, THEN the implementer SHALL stop and report the
   exact file, behavior, ambiguity, and proposed decision before rewriting the
   spec.
5. IF a phase becomes unexpectedly slow, THEN the implementer SHALL stop and
   report the exact command, elapsed time, suspected cause, and the smallest
   proposed split before continuing.

## Requirement NS-9: Audit closure

### Acceptance criteria

1. WHEN `mise run test:spec-style -- --scope=src --format=markdown` reports
   findings, THEN the implementer SHALL treat each finding category as open
   work unless every path in that category is listed as an intentional
   exception with a reason.
2. WHEN the audit reports specs with no `describe` block, THEN the implementer
   SHALL add subject `describe` blocks or record path-specific exceptions
   before marking the category complete.
3. WHEN the audit reports specs with no `when` / `with` / `without` situation
   block, THEN the implementer SHALL add BDD situation groups or record
   path-specific exceptions before marking the category complete.
4. WHEN the audit reports boolean matcher, long description, `test()` import, or
   `test()` call findings, THEN the implementer SHALL fix those findings or
   record path-specific exceptions before marking the category complete.
5. WHEN the final audit closure phase completes, THEN
   `mise run test:spec-style -- --scope=src --strict` SHALL pass unless
   `--strict` intentionally accepts documented exceptions.
