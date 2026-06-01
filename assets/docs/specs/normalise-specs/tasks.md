<!-- markdownlint-disable-file -->
# Normalise source specs — Tasks

## Overview

Use this task list to normalise source spec files against
[`requirements.md`](requirements.md), [`design.md`](design.md), and
[`assets/guides/TESTING_GUIDE.md`](../../../guides/TESTING_GUIDE.md).

**Current status:** reopened. The first pass closed the spec, but follow-up
audits found style drift that `mise run test:spec-audit` does not enforce:
`test()` usage, missing subject `describe` blocks, shallow subject-only specs
with no BDD situation grouping, long example descriptions, boolean matcher
cleanup, and one renderer global event exception that needs to be recorded.

Work one phase at a time. Each phase must preserve behavior, update this file,
run focused verification, run the full quality gate, and create one commit.

Before touching test files, load:

- `.agents/skills/app-context/SKILL.md`
- `.agents/skills/app-testing/SKILL.md`
- `.agents/skills/app-quality-gate/SKILL.md`
- `test-driven-development` for non-trivial test rewrites
- `ast-grep` only if authoring structural searches or rewrites

## Phase workflow

For every phase:

1. Read the phase instructions and referenced acceptance criteria.
2. Inspect the current file content before editing.
3. Implement only that phase.
4. Run the focused verification command listed for the phase.
5. Update the inventory or phase ledger in this file.
6. Run `bash .agents/skills/app-quality-gate/scripts/gate.sh`.
7. Commit exactly that phase's files with the suggested commit command.
8. Continue to the next phase.

If a test's intended behavior is unclear, stop and report the file path, current
assertion, ambiguity, and proposed decision before rewriting it.

If a phase becomes unexpectedly slow, stop instead of pushing through. Report
the exact command, elapsed time, suspected cause, and the smallest proposed
split so the plan can be adjusted before more agent time is spent.

## Inventory ledger

Fill this ledger during phase 0 and update it as later phases complete.

| Phase | File group                     |                                                                                                                                                                                                                  Count | Categories addressed                                                                                                                 | Exceptions                                | Verification                     |
| ----- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- | -------------------------------- |
| 0     | All source specs               |                                                                                                                              127 specs: core 30, shared 4, shell/app 11, shell/main 7, shell/renderer 65, __tests__ 10 | Follow-up inventory refreshed after drift was found                                                                                  | n/a                                       | `mise run test:spec-audit` green |
| 1     | Bun API and descriptions       |                                                                                                                             69 files still import/use `test`; 49 files have no `describe`; 266 descriptions > 40 chars | Reopened: original pass did not include explicit `test()` -> `it()` rule                                                             | n/a                                       | Pending phase 8                  |
| 2     | Readable assertions and tables |                                                                                                                                                                           27 files use `.toBe(true)` or `.toBe(false)` | Reopened: distinguish direct boolean results from opaque boolean expressions                                                         | Record accepted direct boolean assertions | Pending phase 8                  |
| 3     | Mocking and DI                 |                                                                                                                                                                         17 files use `mock`; 3 files use `mock.module` | Review only if touched by phase 8; do not broaden into production refactors                                                          | Record retained external seams            | Pending future cleanup           |
| 4     | DB and fixtures                |                                                                                                                                                                                     Recheck only if touched by phase 8 | Keep YAML fixtures only for import/sync/file-format contracts                                                                        | Record retained fixture reads             | Pending future cleanup           |
| 5     | Error and edge paths           |                                                                                                                                                                                         Recheck only for touched units | Preserve existing behavior; add missing edge cases only when the touched API exposes them                                            | Record n/a reasons                        | Pending future cleanup           |
| 6     | Renderer event semantics       |                                                                                                             1 file uses `window.dispatchEvent`: `src/shell/renderer/hooks/list/use_window_view_nav_keys.hook.spec.tsx` | Likely intentional because the hook listens on `window`; verify and record exception                                                 | Pending explicit exception                | Pending phase 8                  |
| 7     | Co-location and closure        |                                                                                                                                                                                              Previous closure is stale | `test:spec-audit` covers co-location, not Better Specs style                                                                         | n/a                                       | Re-run after phase 8             |
| 8     | Better Specs follow-up         | Stale closure: `test()` conversion landed, but follow-up review still found missing subject `describe` blocks, subject-only specs without BDD situation grouping, long descriptions, and unclassified boolean matchers | Accepted: window.dispatchEvent in view_nav_keys only if wrapped under the hook subject and recorded as a production listener surface | Reopened into phase 9                     |
| 9     | BDD structure completion       |                                                 2 files restructured as BDD models; 127 specs inventoried: 49 no-describe, 73 subject-only, 5 with situations, 273 long descs, 0 boolean matcher, 11 global dispatches | Accepted: `.toBe(false)` for isUsableWorkArea is direct boolean API; placement/state specs kept as the BDD seed models               | Gate green, 645 tests pass                |
| 10    | BDD context setup completion   |                                                                                                                                                                                                                        |                                                                                                                                      | Pending                                   |
| 11    | Factories and local builders   |                                                                                                                                                                                                                        |                                                                                                                                      | Pending                                   |
| 12    | Complete Better Specs audit    |                                                                                                                                                                                                                        |                                                                                                                                      | Pending                                   |
| 13    | Explicit subject convention    |                                                                                                                                                                                                                        |                                                                                                                                      | Pending                                   |
| 14    | Audit finding burn-down        |                                                                     Pending: close `test:spec-style` finding categories one by one: no describe, no situation, boolean matchers, long descriptions, and `test()` usage | Documentation-only findings are not complete unless every path is a named exception                                                  | Pending                                   |

## Phase 0 — Inventory and baseline

**Goal:** Record the current source spec surface before normalising.

**Suggested commit command:**

```sh
git commit -m "$(cat <<'EOF'
docs(test): Record spec normalisation baseline

Changes:
- Add the source spec normalisation inventory
- Record testing-guide categories for the cleanup pass
- Capture baseline verification commands for later phases

Why:
- Gives the spec cleanup a safe starting point
- Keeps future test rewrites traceable to the testing guide
EOF
)"
```

- [x] 0.1 Inventory source specs.
  - Run `find src -type f \( -name '*.spec.ts' -o -name '*.spec.tsx' -o -name '*.e2e.spec.ts' \) | sort`.
  - Record total count and layer counts in the inventory ledger.
  - _Acceptance criteria: NS-1.1, NS-1.2_

- [x] 0.2 Classify testing-guide categories.
  - Use `rg` to identify likely `context`, `should`, non-`bun:test` imports,
    mocks, `spyOn`, disk database paths, fixture reads, boolean matcher
    expressions, and long repeated case groups.
  - Record counts by category in the inventory ledger.
  - _Acceptance criteria: NS-1.3, NS-1.4_

- [x] 0.3 Run baseline verification.
  - Run `bun test`.
  - Run `mise run test:spec-audit` if available.
  - Run the full quality gate.
  - Record exact results in the ledger.
  - _Acceptance criteria: NS-7.2, NS-8.1, NS-8.2_

## Phase 1 — Bun API and description style

**Goal:** Normalise low-risk test API and naming style.

**Follow-up note:** this phase is incomplete under the clarified policy. Phase 8
owns the remaining `test()` -> `it()` and subject `describe` cleanup.

**Suggested commit command:**

```sh
git commit -m "$(cat <<'EOF'
test(specs): Normalise Bun test descriptions

Changes:
- Use Bun test APIs consistently in source specs
- Replace context-style grouping with nested describe blocks
- Remove should-style wording from touched test descriptions

Why:
- Aligns the suite with the testing guide
- Makes spec output easier to scan and maintain
EOF
)"
```

- [x] 1.1 Replace unsupported grouping patterns.
  - Remove `context` aliases and use nested `describe`.
  - Keep situation group names starting with `when`, `with`, or `without`.
  - _Acceptance criteria: NS-2.1, NS-2.2_

- [x] 1.2 Normalise behavior descriptions.
  - Remove "should" from `describe` and `it` text.
  - Prefer present-tense behavior statements.
  - Use `.` or `#` method labels when a spec describes class/static or
    instance methods.
  - _Acceptance criteria: NS-2.3, NS-2.4_

- [x] 1.3 Verify phase 1.
  - Run focused `bun test` commands for touched directories.
  - Run the full quality gate.
  - Update the inventory ledger with touched file counts and any exceptions.
  - _Acceptance criteria: NS-8.1, NS-8.2_

## Phase 2 — Readable assertions and table cases

**Goal:** Improve spec readability without changing behavior.

**Suggested commit command:**

```sh
git commit -m "$(cat <<'EOF'
test(specs): Improve assertion readability

Changes:
- Replace opaque boolean matcher expressions with readable matchers
- Convert repeated equivalent cases to table-driven tests
- Keep unit specs focused on one primary behavior assertion

Why:
- Makes failures easier to diagnose
- Reduces repeated test setup while preserving behavior
EOF
)"
```

- [x] 2.1 Replace boolean matcher expressions.
  - Convert patterns like `expect(value === expected).toBe(true)` to direct
    matchers.
  - Keep assertion meaning unchanged.
  - _Acceptance criteria: NS-3.1, NS-3.3_

- [x] 2.2 Extract table-driven cases.
  - Convert repeated equivalent input/output tests to local `cases` arrays.
  - Do not table-drive cases that need distinct setup narratives.
  - _Acceptance criteria: NS-3.4_

- [x] 2.3 Record integration-test exceptions.
  - If a slow integration spec keeps multiple expectations in one test, record
    the file path and reason in the inventory ledger.
  - _Acceptance criteria: NS-3.2_

- [x] 2.4 Verify phase 2.
  - Run focused `bun test` commands for touched directories.
  - Run the full quality gate.
  - Update the inventory ledger.
  - _Acceptance criteria: NS-8.1, NS-8.2_

## Phase 3 — Mocking and dependency injection

**Goal:** Reduce internal mocks while preserving legitimate external seams.

**Suggested commit command:**

```sh
git commit -m "$(cat <<'EOF'
test(specs): Prefer test doubles over mocks

Changes:
- Replace internal mocks with dependency-injected test doubles where safe
- Keep required external or non-deterministic mocks narrow
- Record follow-ups for mock removal that requires production refactors

Why:
- Aligns tests with the project dependency-injection style
- Keeps test behavior closer to real application behavior
EOF
)"
```

- [x] 3.1 Inventory mock usage.
  - Search for `mock(`, `spyOn`, module mocking, and ad hoc monkey patches.
  - Classify each as internal logic, external service, slow operation, or
    non-deterministic behavior.
  - _Acceptance criteria: NS-4.1, NS-4.2_

- [x] 3.2 Replace safe internal mocks.
  - Use dependency injection, local test doubles, or real lightweight adapters.
  - Do not change production behavior solely for this phase.
  - _Acceptance criteria: NS-4.1, NS-4.3_

- [x] 3.3 Document remaining mocks.
  - Keep allowed mocks local and narrow.
  - Record each retained mock exception in the ledger with a reason.
  - _Acceptance criteria: NS-1.4, NS-4.2, NS-4.3_

- [x] 3.4 Verify phase 3.
  - Run focused `bun test` commands for touched files.
  - Run the full quality gate.
  - Update the inventory ledger.
  - _Acceptance criteria: NS-8.1, NS-8.2, NS-8.4_

## Phase 4 — Database and fixture discipline

**Goal:** Ensure DB and fixture specs follow the project test data policy.

**Suggested commit command:**

```sh
git commit -m "$(cat <<'EOF'
test(specs): Normalise test data setup

Changes:
- Use in-memory SQLite for database specs
- Prefer testing factories and helpers for generated data
- Keep YAML fixtures only for file-format integration behavior

Why:
- Makes specs isolated and deterministic
- Keeps fixture usage limited to real integration contracts
EOF
)"
```

- [x] 4.1 Normalise SQLite setup.
  - Use `:memory:` databases or shared `@testing` helpers for DB specs.
  - Close databases after each spec where ownership is local.
  - _Acceptance criteria: NS-5.1_

- [x] 4.2 Prefer factories and helpers.
  - Replace ad hoc bulky test data with `factoryFor` or focused builders when
    the replacement is behavior-preserving.
  - Create only the records required by the spec.
  - _Acceptance criteria: NS-5.2, NS-5.4_

- [x] 4.3 Audit YAML fixture usage.
  - Keep fixture reads only for import, sync, and file-format integration.
  - Record approved fixture exceptions in the ledger.
  - _Acceptance criteria: NS-5.3_

- [x] 4.4 Verify phase 4.
  - Run focused `bun test` commands for touched DB, import, and sync specs.
  - Run the full quality gate.
  - Update the inventory ledger.
  - _Acceptance criteria: NS-8.1, NS-8.2_

## Phase 5 — Error and edge-path coverage

**Goal:** Add missing tests for public invalid, empty, boundary, and async error
behavior found during the cleanup.

**Suggested commit command:**

```sh
git commit -m "$(cat <<'EOF'
test(specs): Cover edge and error paths

Changes:
- Add missing invalid, empty, and boundary cases for touched units
- Assert async rejection and error shapes directly
- Record non-applicable cases in the spec ledger

Why:
- Makes the test suite better at catching regressions
- Aligns touched specs with the testing guide's edge-case policy
EOF
)"
```

- [x] 5.1 Add missing edge cases for touched units.
  - Cover valid, invalid, empty, undefined, and boundary behavior where the
    public API exposes those cases.
  - Record `n/a` reasons for cases that do not apply.
  - _Acceptance criteria: NS-6.1_

- [x] 5.2 Assert async errors directly.
  - Use `rejects` or explicit response-shape assertions for async failures.
  - Avoid broad snapshots for error behavior.
  - _Acceptance criteria: NS-6.2_

- [x] 5.3 Verify phase 5.
  - Run focused `bun test` commands for touched files.
  - Run the full quality gate.
  - Update the inventory ledger.
  - _Acceptance criteria: NS-8.1, NS-8.2, NS-8.4_

## Phase 6 — Renderer event semantics

**Goal:** Align renderer specs with production event surfaces.

**Suggested commit command:**

```sh
git commit -m "$(cat <<'EOF'
test(renderer): Align events with production surfaces

Changes:
- Dispatch keyboard and focus events through production-owned surfaces
- Keep renderer tests independent of a real Electrobun runtime
- Record preview e2e blockers when manual confidence cannot run

Why:
- Prevents tests from passing through unrealistic document-level paths
- Improves confidence in renderer behavior without adding flaky runtime tests
EOF
)"
```

- [x] 6.1 Audit renderer event tests.
  - Search renderer specs for `document.dispatchEvent`, direct global event
    dispatch, focus helpers, and keyboard shortcuts.
  - Identify the production surface each test must target.
  - _Acceptance criteria: NS-6.3_

- [x] 6.2 Rewrite safe event tests.
  - Dispatch keyboard, focus, and pointer events through the rendered element,
    hook harness, or helper used by production.
  - Keep tests independent of a real Electrobun runtime.
  - _Acceptance criteria: NS-6.3_

- [x] 6.3 Verify phase 6.
  - Run focused renderer `bun test` commands for touched files.
  - Run `mise run e2e:preview` when Chromium and preview data are available.
  - If preview e2e cannot run, record the exact blocker.
  - Run the full quality gate.
  - Update the inventory ledger.
  - _Acceptance criteria: NS-8.1, NS-8.2, NS-8.4_

## Phase 7 — Co-location audit and closure

**Goal:** Close the normalisation pass with spec-audit evidence and future
enforcement recommendations.

**Suggested commit command:**

```sh
git commit -m "$(cat <<'EOF'
test(specs): Close normalisation pass

Changes:
- Record final spec-audit and quality-gate evidence
- Document accepted testing-guide exceptions
- Capture future enforcement candidates for recurring patterns

Why:
- Leaves the suite with a clear testing-policy baseline
- Gives future guard work a reviewed source of truth
EOF
)"
```

- [x] 7.1 Run the co-location audit.
  - Run `mise run test:spec-audit`.
  - Run `mise run test:spec-audit --strict` if the project expects strict mode
    by this point.
  - Record missing specs and accepted exemption categories.
  - _Acceptance criteria: NS-7.1, NS-7.2, NS-7.3_

- [x] 7.2 Run final verification.
  - Run `bun test`.
  - Run `bun test --coverage`.
  - Run the full quality gate.
  - Record final counts and deltas in the inventory ledger.
  - _Acceptance criteria: NS-8.1, NS-8.2_

- [x] 7.3 Document enforcement candidates.
  - List recurring patterns that are safe candidates for future `ast-grep`,
    Biome, or test-audit enforcement.
  - Do not add new enforcement in this phase unless the cleanup has made the
    rule unambiguous and low risk.
  - _Acceptance criteria: NS-8.3_

## Phase 8 — Better Specs follow-up

**Goal:** Complete the normalisation gaps found after the first closure.

**Suggested commit command:**

```sh
git commit -m "$(cat <<'EOF'
test(specs): Complete Better Specs normalisation

Changes:
- Convert source spec behavior examples from test() to it()
- Add subject describe blocks where specs currently use top-level examples
- Refresh the normalise-specs ledger with current audit evidence

Why:
- Aligns the test suite with the clarified testing guide
- Closes the style drift missed by the co-location spec audit
EOF
)"
```

- [x] 8.1 Refresh the Better Specs inventory.
  - Run the following scans and update the inventory ledger before editing:

    ```sh
    find src -type f \( -name '*.spec.ts' -o -name '*.spec.tsx' -o -name '*.e2e.spec.ts' \) | sort | wc -l
    rg -l "import \{[^}]*\btest\b|(^|[^A-Za-z0-9_])test\(" src --glob '*.spec.ts' --glob '*.spec.tsx' --glob '*.e2e.spec.ts' | sort
    rg -n "\bcontext\s*\(|\bshould\b|\.toBe\(true\)|\.toBe\(false\)|window\.dispatchEvent|document\.dispatchEvent" src --glob '*.spec.ts' --glob '*.spec.tsx' --glob '*.e2e.spec.ts'
    ```

  - Record the current counts for total specs, `test()` files, files without
    `describe`, long descriptions, boolean matcher candidates, mocks, and
    global event dispatches.
  - _Acceptance criteria: NS-1.1, NS-1.2, NS-1.3, NS-1.4, NS-2.2, NS-2.4_

- [x] 8.2 Convert `test()` examples to `it()`.
  - Replace `test` imports from `bun:test` with `it` in source specs.
  - Replace each behavior example `test(...)` with `it(...)`.
  - Do not alter callback bodies except where required by nearby
    Better Specs cleanup.
  - Start with smaller, pure files such as
    `src/shell/main/window/placement.util.spec.ts`,
    `src/shell/main/window/state.spec.ts`, `src/shared/logging/*.spec.ts`,
    and `src/core/helpers/entry_action/*.spec.ts`; then proceed by layer.
  - _Acceptance criteria: NS-2.1, NS-2.2, NS-8.1_

- [x] 8.3 Add subject `describe` blocks.
  - For files with top-level `it()` examples, wrap related examples in a
    subject `describe('<subject>', () => { ... })`.
  - Prefer the public exported subject name:
    - `describe('parseConfig')` for exported functions.
    - `describe('ConfigLoader')` with nested `describe('.fromFile')` for
      static or factory methods.
    - `describe('ConfigLoader')` with nested `describe('#validate')` for
      instance methods.
    - `describe('EntryRow')` for React components.
    - `describe('useViewNavigation')` for hooks.
    - `describe('POST /api/list')` for RPC routes.
  - For multi-export utility modules, either group by a clear module concept
    with nested exported subjects, or make the dominant exported function the
    top-level subject.
  - Avoid vague subjects such as `utils`, `helpers`, or `validation` unless
    that phrase is the public concept a reader would use to find the behavior;
    record any such exception in the ledger.
  - If a single-example pointer spec is clearer without a subject describe,
    record the path and reason in the ledger instead of silently preserving it.
  - _Acceptance criteria: NS-2.3, NS-2.4, NS-2.5, NS-2.6, NS-2.7, NS-2.9_

- [x] 8.4 Split long descriptions safely.
  - For behavior descriptions longer than 40 characters, move condition text
    into nested `describe('when ...')`, `describe('with ...')`, or
    `describe('without ...')` blocks.
  - Keep example names present-tense and behavior-focused.
  - Do not force table-driven tests when a nested group communicates the case
    better.
  - _Acceptance criteria: NS-2.8, NS-3.4_

- [x] 8.5 Classify boolean matcher candidates.
  - Replace opaque expressions such as `expect(value === expected).toBe(true)`
    with readable matchers.
  - Keep direct boolean API assertions such as `expect(isValid(value)).toBe(true)`
    when they are the clearest behavior assertion, and record that policy in
    the ledger.
  - _Acceptance criteria: NS-3.1, NS-3.2, NS-3.3_

- [x] 8.6 Record renderer global event exceptions.
  - Inspect `src/shell/renderer/hooks/list/use_window_view_nav_keys.hook.spec.tsx`.
  - If `window.dispatchEvent` matches the production listener surface, keep it
    and record the exception in the ledger.
  - If any dispatch targets an unrealistic surface, rewrite it through the
    rendered element, hook harness, or helper used by production.
  - _Acceptance criteria: NS-6.3, NS-8.4_

- [x] 8.7 Verify and close the follow-up.
  - Run focused `bun test` commands for each touched layer.
  - Run `mise run test:spec-audit`.
  - Run `bun test`.
  - Run `bash .agents/skills/app-quality-gate/scripts/gate.sh`.
  - Update this file with final counts and accepted exceptions.
  - _Acceptance criteria: NS-7.2, NS-8.1, NS-8.2_

## Phase 9 — BDD structure completion

**Goal:** Complete the Better Specs BDD shape that phase 8 did not finish.
Every source spec should read as subject -> situation -> behavior where that
structure adds clarity. This phase covers files that already have `it()` but
still lack subject `describe` blocks, nested situation `describe` blocks, or
short behavior names.

**Suggested commit command:**

```sh
git commit -m "$(cat <<'EOF'
test(specs): Complete BDD spec structure

Changes:
- Add subject and situation describe blocks to source specs
- Split long behavior descriptions into BDD contexts
- Record retained boolean and global event exceptions

Why:
- Aligns source specs with the Better Specs guidance
- Makes spec output easier to scan by subject, situation, and behavior
EOF
)"
```

- [x] 9.1 Refresh the BDD structure inventory.
  - Run a script or focused scans that report:
    - spec files with executable `it()` examples and no `describe`;
    - spec files with subject `describe` blocks but no nested situation
      `describe('when ...')`, `describe('with ...')`, or
      `describe('without ...')` where examples encode conditions in their names;
    - `it()` descriptions longer than 40 characters;
    - `.toBe(true)` and `.toBe(false)` occurrences;
    - `window.dispatchEvent` and `document.dispatchEvent` occurrences.
  - Treat `src/shell/main/window/placement.util.spec.ts` as the seed example:
    it has subject describes, but its condition text still lives in long
    example names instead of nested BDD situation groups.
  - Update the inventory ledger with the refreshed counts before editing.
  - _Acceptance criteria: NS-1.1, NS-1.3, NS-1.4, NS-2.3, NS-2.4, NS-2.8_

- [x] 9.2 Add missing subject `describe` blocks.
  - For each file with top-level `it()` examples, wrap examples in the public
    subject from the exported function, component, hook, route, or clear module
    concept.
  - Do not use the `context()` API or alias; BDD contexts in this repo are
    nested `describe(...)` blocks.
  - Record any single-example helper or pointer spec intentionally left without
    a subject `describe`, with the path and reason.
  - _Acceptance criteria: NS-2.3, NS-2.4, NS-2.5, NS-2.7, NS-2.9_

- [x] 9.3 Add BDD situation groups where examples encode context.
  - Within each subject, move condition/setup text from `it()` names into nested
    `describe('when ...')`, `describe('with ...')`, or
    `describe('without ...')` blocks.
  - Keep the `it()` text short, present-tense, and outcome-focused.
  - Start with `src/shell/main/window/placement.util.spec.ts` and use it as the
    model for multi-export utility specs:
    - `describe('centerBoundsInWorkArea')`
      - `describe('with a zero-origin work area')`
      - `describe('with a non-zero work-area origin')`
      - `describe('with fractional input sizes')`
    - `describe('isUsableWorkArea')`
      - `describe('with invalid dimensions')`
      - `describe('with a normal work area')`
    - `describe('resolveInitialFrame')`
      - `describe('when display has a usable work area')`
      - `describe('when display is missing')`
      - `describe('when Electrobun reports an empty work area')`
  - Apply the same pattern by layer: `src/core`, `src/shared`, `src/shell/app`,
    `src/shell/main`, then `src/shell/renderer`.
  - _Acceptance criteria: NS-2.3, NS-2.8, NS-3.4_

- [x] 9.4 Split long descriptions without changing behavior.
  - Re-run the long-description scan after each layer.
  - For descriptions longer than 40 characters, prefer adding or refining a
    nested situation `describe` over truncating useful meaning.
  - Do not rewrite assertion bodies unless the old wording is coupled to an
    opaque boolean matcher covered by task 9.5.
  - Record any intentionally long table row name or generated case label that
    remains, with the path and reason.
  - _Acceptance criteria: NS-2.8, NS-3.4, NS-8.1_

- [x] 9.5 Classify boolean matcher candidates.
  - Replace opaque boolean expressions such as
    `expect(value === expected).toBe(true)` with readable matchers.
  - Keep direct boolean API assertions such as
    `expect(isUsableWorkArea(value)).toBe(false)` when the boolean result is the
    public behavior under test.
  - For touched files, prefer clearer matchers where they improve output without
    obscuring the API contract; for example, `Number.isInteger(frame.x)` can
    stay as a direct boolean assertion if the spec subject is integer rounding.
  - Record the retained direct-boolean policy and any unusual retained case in
    the ledger.
  - _Acceptance criteria: NS-3.1, NS-3.2, NS-3.3_

- [x] 9.6 Record renderer global event exceptions.
  - Keep `window.dispatchEvent` only where production listens on `window`, such
    as `useWindowViewNavKeys`.
  - Wrap retained global event examples under the hook/component subject and a
    situation `describe` that explains the production listener surface.
  - Rewrite any unrealistic global event dispatch through the rendered element,
    hook harness, or public helper used by production.
  - Update the ledger with accepted global-event paths and reasons.
  - _Acceptance criteria: NS-6.3, NS-8.4_

- [x] 9.7 Verify and close the BDD follow-up.
  - Run focused `bun test <path>` commands for every touched layer.
  - Run `mise run test:spec-audit`.
  - Run the refreshed BDD structure scans from task 9.1 and record final counts.
  - Run `bun test`.
  - Run `bash .agents/skills/app-quality-gate/scripts/gate.sh`. If the gate
    fails because of local temp-directory permissions, stop and report the exact
    failing command instead of marking the phase complete.
  - Update this file with final counts, retained exceptions, and verification
    evidence before committing.
  - _Acceptance criteria: NS-7.2, NS-8.1, NS-8.2, NS-8.4_

## Phase 10 — BDD context setup completion

**Goal:** Normalise the content inside BDD contexts so setup, action, and
assertion placement matches [`assets/guides/TESTING_GUIDE.md`](../../../guides/TESTING_GUIDE.md).
Phase 9 added or modelled BDD labels; this phase makes the context blocks carry
the actual shared context where doing so improves clarity.

**Suggested commit command:**

```sh
git commit -m "$(cat <<'EOF'
test(specs): Normalise BDD context setup

Changes:
- Move shared immutable setup into BDD context blocks
- Use action helpers so examples stay focused on behavior
- Record intentional inline setup exceptions

Why:
- Makes context blocks describe real state, not only labels
- Keeps specs easier to extend with multiple focused examples
EOF
)"
```

- [x] 10.1 Refresh the context-content inventory.
  - Scan source specs for nested situation `describe('when ...')`,
    `describe('with ...')`, and `describe('without ...')` blocks whose examples
    still build the full context inside each `it()` body.
  - Record likely candidates in the ledger. Include at least:
    - `src/shell/main/window/placement.util.spec.ts`;
    - `src/shell/main/window/state.spec.ts`;
    - any files changed by phase 9 that now have situation describes.
  - Categorise each candidate as pure immutable setup, mutable/effectful setup,
    or unique one-example setup.
  - _Acceptance criteria: NS-1.3, NS-1.4, NS-2.3, NS-2.8, NS-3.1_

- [x] 10.2 Move pure immutable context setup into context blocks.
  - For deterministic pure helpers, place shared input constants inside the
    nested situation `describe(...)`.
  - Add a local action helper when the result should be recomputed for each
    example, for example:

    ```ts
    describe('with a zero-origin work area', () => {
      const workArea = factoryFor('rectangle')
      const windowSize = factoryFor('windowSize')

      const frame = () => centerBoundsInWorkArea(workArea, windowSize)

      it('centers the window', () => {
        expect(frame()).toEqual({ x: 620, y: 330, width: 680, height: 420 })
      })
    })
    ```

  - Do not compute mutable or effectful results once in `describe(...)`.
  - Start with `src/shell/main/window/placement.util.spec.ts` and use it as the
    model for other pure utility specs.
  - _Acceptance criteria: NS-2.3, NS-2.8, NS-3.1, NS-3.4_

- [x] 10.3 Use `beforeEach` only for fresh mutable setup.
  - For DB, renderer, DOM, timers, files, mocks, or any mutable object that must
    be reset per example, keep setup in `beforeEach(...)` or a local builder
    called inside the example.
  - Do not introduce shared mutable fixtures at module scope or `describe(...)`
    scope.
  - Record any retained inline setup where moving it outward would hide the
    example's only meaningful action.
  - _Acceptance criteria: NS-3.1, NS-4.1, NS-5.1, NS-8.4_

- [x] 10.4 Split examples that now have reusable context.
  - When moving context setup reveals multiple independent expectations in one
    unit test, split them into separate `it(...)` examples under the same
    context.
  - Keep multiple expectations only for expensive integration setup and record
    that reason in the ledger.
  - _Acceptance criteria: NS-3.1, NS-3.2, NS-3.4_

- [x] 10.5 Verify and close the context-content follow-up.
  - Run focused `bun test <path>` commands for every touched file or directory.
  - Run `mise run test:spec-audit`.
  - Run the context-content inventory scan from task 10.1 and record final
    counts plus retained exceptions.
  - Run `bun test`.
  - Run `bash .agents/skills/app-quality-gate/scripts/gate.sh`.
  - Update this file with final evidence before committing.
  - _Acceptance criteria: NS-7.2, NS-8.1, NS-8.2, NS-8.4_

## Phase 11 — Factories and local builders

**Goal:** Normalise setup data so specs use project factories for recurring
project-owned shapes, local builders only for one-file incidental values, and
inline literals only when the value is unique and clearer inline. This phase applies the
factory/builder clarification in [`assets/guides/TESTING_GUIDE.md`](../../../guides/TESTING_GUIDE.md).

**Suggested commit command:**

```sh
git commit -m "$(cat <<'EOF'
test(specs): Normalise test data builders

Changes:
- Use project factories for recurring project-shaped spec data
- Add local builders only for one-file incidental values
- Record shared-example candidates and inline literal exceptions

Why:
- Reduces magic setup data in specs
- Keeps BDD contexts focused on meaningful state
EOF
)"
```

- [x] 11.1 Refresh the setup-data inventory.
  - Scan touched and representative source specs for hard-coded setup objects,
    repeated prop literals, and repeated primitive tuples.
  - Classify each candidate as:
    - `factoryFor(...)` candidate: app domain records, RPC knowledge rows,
      renderer props shaped from entries/tasks/config, geometry, display/window
      data, typed events, and any exported project type reused across specs;
    - local builder candidate: one-file primitive values whose shape is not a
      stable project concept yet;
    - inline literal exception: one-off values whose names would add noise.
  - Include at least:
    - `src/shell/renderer/components/detail/dependency_graph.component.spec.tsx`
      as a `factoryFor(...)` candidate;
    - `src/shell/main/window/placement.util.spec.ts` as a local builder
      candidate.
  - Record counts and examples in the ledger before editing.
  - _Acceptance criteria: NS-1.3, NS-1.4, NS-3.1, NS-5.2, NS-5.4_

- [x] 11.2 Use factories for project-shaped data.
  - Replace hand-built or over-specified project-shaped records with
    `factoryFor(...)` plus minimal overrides.
  - For renderer component specs, prefer factories when props represent app
    entries, tasks, config, geometry, display/window data, or RPC knowledge rows.
  - Start with
    `src/shell/renderer/components/detail/dependency_graph.component.spec.tsx`:
    keep task records created by `factoryFor('task')`, but reduce noisy overrides
    to the fields that matter for each context and move them into the relevant
    BDD setup block.
  - Use registered factories for geometry where they exist, such as
    `factoryFor('rectangle')` and `factoryFor('windowSize')`. Add a factory or
    named variant when a geometry/display shape recurs across files.
  - _Acceptance criteria: NS-3.1, NS-5.2, NS-5.4, NS-5.5, NS-5.6_

- [x] 11.3 Add local builders for primitive setup data.
  - For one-file primitive setup that is not a stable project concept, add small
    local builders near the spec: `keyboardEvent(...)`, `domRect(...)`, or
    similarly specific names.
  - Builders must expose meaningful defaults and override only the fields needed
    by the context. If the builder appears in a second file, promote it to
    `src/__tests__/factories/factories.builder.ts`.
  - Start with `src/shell/main/window/placement.util.spec.ts` and avoid
    anonymous geometry literals where `factoryFor('rectangle')` or
    `factoryFor('windowSize')` makes the behavior clearer.
  - Keep unique one-off literals inline when extracting them would obscure the
    example.
  - _Acceptance criteria: NS-2.3, NS-2.8, NS-3.1, NS-3.4, NS-5.5_

- [x] 11.4 Review shared-example candidates.
  - Prefer table-driven cases or local helper functions for repeated primitive
    examples.
  - Introduce shared behavior helpers only when the same observable contract
    repeats across multiple subjects and the helper keeps output clearer than
    explicit examples.
  - Record any shared-example candidate that is intentionally left explicit.
  - _Acceptance criteria: NS-3.4, NS-8.4_

- [x] 11.5 Verify and close the setup-data follow-up.
  - Run focused `bun test <path>` commands for every touched file or directory.
  - Run `mise run test:spec-audit`.
  - Run `bun test`.
  - Run `bash .agents/skills/app-quality-gate/scripts/gate.sh`.
  - Update this file with final inventory counts, retained inline literal
    exceptions, and verification evidence before committing.
  - _Acceptance criteria: NS-7.2, NS-8.1, NS-8.2, NS-8.4_

## Phase 12 — Complete Better Specs audit

**Goal:** Finish the normalise-specs work with a repeatable mise audit command
and layer-by-layer evidence. Do not rely on manual inspection alone. Every
remaining Better Specs style finding must either be fixed or recorded as an
explicit exception in this task ledger.

**Suggested commit command:**

```sh
git commit -m "$(cat <<'EOF'
test(specs): Complete Better Specs audit

Changes:
- Add repeatable source spec style audit evidence
- Close remaining Better Specs findings by source layer
- Record retained exceptions and final verification

Why:
- Makes normalise-specs completion measurable
- Prevents future handoffs from relying on manual style scans
EOF
)"
```

- [x] 12.1 Fix guide and factory registry drift.
  - Correct `assets/guides/TESTING_GUIDE.md` so examples only reference factory
    names that exist in `src/__tests__/factories/factories.builder.ts`, or add
    the missing factory first when the shared factory is intentional.
  - Clarify that new shared factories are allowed for repeated meaningful test
    shapes, but the registry and guide must agree.
  - Execute exactly:

    ```sh
    rg -n "factoryFor\('(workArea|display)'" assets/guides src
    rg -n "env:|rawConfig:|loadedConfig:|bookmark:|command:|cheat:|task:|'knowledge:weaker'|'knowledge:stronger'|rectangle:|windowSize:" src/__tests__/factories/factories.builder.ts
    bun test src/__tests__/factories/factories.builder.spec.ts
    ```

  - Expected result: the first command returns no guide examples for unregistered
    factories. If a new factory name is intentional, add it to the registry and
    the factory spec before using it in guide examples.
  - _Acceptance criteria: NS-1.4, NS-5.2, NS-5.4_

- [x] 12.2 Add the repeatable Better Specs style audit command.
  - Add a root mise task named `test:spec-style`.
  - Use `usage` flags instead of environment variables, following
    `assets/guides/MISE_GUIDE.md`.
  - The canonical command must be `mise run test:spec-style -- <flags>`.
    Implementation may use an internal TypeScript helper if the mise task stays
    the only documented entrypoint.
  - The task must support:
    - `--scope <path>` with default `src`;
    - `--strict` to exit non-zero when unrecorded findings remain;
    - `--format text` and `--format markdown`;
    - `--update-ledger` to update only the machine-owned Phase 12 audit block in
      this file.
  - Add a machine-owned audit block below this task list using these exact
    markers, and make `--update-ledger` rewrite only the content between them:

    ```md
    <!-- phase-12-style-audit:start -->
    <!-- phase-12-style-audit:end -->
    ```

  - The task must report:
    - `test()` imports and calls;
    - executable `it()` examples with no subject `describe`;
    - files with examples but no `when` / `with` / `without` situation group;
    - specs where the subject is not explicit through a subject `describe`,
      `subject`, `Subject`, `makeSubject()`, `renderSubject()`, or action
      helper;
    - `it()` descriptions longer than 40 characters;
    - `.toBe(true)` and `.toBe(false)` candidates;
    - `window.dispatchEvent` and `document.dispatchEvent` occurrences;
    - `mock`, `spyOn`, and `mock.module` occurrences;
    - `factoryFor('...')` names not registered in
      `src/__tests__/factories/factories.builder.ts`.
  - Execute exactly:

    ```sh
    mise run test:spec-style -- --scope=src --format=markdown
    mise run test:spec-style -- --scope=src --format=markdown --update-ledger
    mise run test:spec-style -- --scope=src --strict
    ```

  - Expected result: the markdown run prints counts, `--update-ledger` records
    those counts in the machine-owned Phase 12 block, and the strict run may
    fail before implementation only with actionable file paths and categories.
  - _Acceptance criteria: NS-1.1, NS-1.3, NS-1.4, NS-2.2, NS-2.4, NS-2.8,
    NS-3.3, NS-7.2_

- [x] 12.3 Record the Phase 12 baseline.
  - Run the audit once before editing source specs and let the mise task update
    the machine-owned ledger block.
  - Execute exactly:

    ```sh
    mise run test:spec-style -- --scope=src --format=markdown --update-ledger
    mise run test:spec-audit
    git status --short
    ```

  - Expected result: this task records baseline counts and confirms whether
    unrelated staged or untracked files exist before implementation starts.
  - _Acceptance criteria: NS-1.1, NS-1.2, NS-1.3, NS-1.4, NS-7.2_

- [x] 12.4 Normalise the test-helper layer.
  - Scope: `src/__tests__`.
  - Fix or record findings from the style audit. Use `factoryFor(...)` and
    shared helpers where the setup shape is reusable; use local builders for
    local-only primitive shapes.
  - Execute exactly:

    ```sh
    mise run test:spec-style -- --scope=src/__tests__ --format=markdown --update-ledger
    bun test src/__tests__
    mise run test:spec-style -- --scope=src/__tests__ --strict
    ```

  - Expected result: strict mode is green for this scope, or every remaining
    finding is listed in the exception ledger with a reason.
  - _Acceptance criteria: NS-1.4, NS-2.3, NS-2.4, NS-2.8, NS-3.1, NS-5.2_

- [x] 12.5 Normalise the core layer.
  - Scope: `src/core`.
  - Prioritise pure-function BDD structure, table-driven cases, readable
    matchers, and local builders over broad shared fixtures.
  - Execute exactly:

    ```sh
    mise run test:spec-style -- --scope=src/core --format=markdown --update-ledger
    bun test src/core
    mise run test:spec-style -- --scope=src/core --strict
    ```

  - Expected result: strict mode is green for this scope, or every remaining
    finding is listed in the exception ledger with a reason.
  - _Acceptance criteria: NS-1.4, NS-2.3, NS-2.4, NS-2.8, NS-3.1, NS-3.3,
    NS-3.4, NS-6.1_

- [x] 12.6 Normalise the shared layer.
  - Scope: `src/shared`.
  - Keep specs pure and avoid setup helpers that obscure simple inputs.
  - Execute exactly:

    ```sh
    mise run test:spec-style -- --scope=src/shared --format=markdown --update-ledger
    bun test src/shared
    mise run test:spec-style -- --scope=src/shared --strict
    ```

  - Expected result: strict mode is green for this scope, or every remaining
    finding is listed in the exception ledger with a reason.
  - _Acceptance criteria: NS-1.4, NS-2.3, NS-2.4, NS-2.8, NS-3.1, NS-3.3_

- [x] 12.7 Normalise the shell app layer.
  - Scope: `src/shell/app`.
  - Preserve in-memory SQLite patterns and file-format fixture exceptions.
  - Execute exactly:

    ```sh
    mise run test:spec-style -- --scope=src/shell/app --format=markdown --update-ledger
    bun test src/shell/app
    mise run test:spec-style -- --scope=src/shell/app --strict
    ```

  - Expected result: strict mode is green for this scope, or every remaining
    finding is listed in the exception ledger with a reason.
  - _Acceptance criteria: NS-1.4, NS-2.3, NS-2.4, NS-2.8, NS-3.1, NS-5.1,
    NS-5.2, NS-5.3, NS-6.2_

- [x] 12.8 Normalise the shell main layer.
  - Scope: `src/shell/main`.
  - Preserve Electrobun-specific pointer specs only when the exception is
    explicitly recorded.
  - Execute exactly:

    ```sh
    mise run test:spec-style -- --scope=src/shell/main --format=markdown --update-ledger
    bun test src/shell/main
    mise run test:spec-style -- --scope=src/shell/main --strict
    ```

  - Expected result: strict mode is green for this scope, or every remaining
    finding is listed in the exception ledger with a reason.
  - _Acceptance criteria: NS-1.4, NS-2.3, NS-2.4, NS-2.8, NS-3.1, NS-5.2,
    NS-6.1, NS-6.2_

- [x] 12.9 Normalise the shell renderer layer.
  - Scope: `src/shell/renderer`.
  - Use `factoryFor(...)` or shared test helpers for entry/task/config/RPC-shaped
    props, local render helpers for component setup, and explicit global event
    exceptions only where production listens on the same global surface.
  - Execute exactly:

    ```sh
    mise run test:spec-style -- --scope=src/shell/renderer --format=markdown --update-ledger
    bun test src/shell/renderer
    mise run test:spec-style -- --scope=src/shell/renderer --strict
    ```

  - Expected result: strict mode is green for this scope, or every remaining
    finding is listed in the exception ledger with a reason.
  - _Acceptance criteria: NS-1.4, NS-2.3, NS-2.4, NS-2.8, NS-3.1, NS-4.1,
    NS-4.2, NS-6.3_

- [x] 12.10 Close the complete audit.
  - Run final global checks and let the mise task update the machine-owned
    ledger block.
  - Execute exactly:

    ```sh
    mise run test:spec-style -- --scope=src --format=markdown --update-ledger
    mise run test:spec-style -- --scope=src --strict
    mise run test:spec-audit
    bun test
    git diff --check
    git diff --cached --check
    bash .agents/skills/app-quality-gate/scripts/gate.sh
    ```

  - Expected result: all commands are green before this phase is marked complete.
    If strict style audit remains red, each remaining finding must be recorded
    in this ledger as an intentional exception with path, category, and reason.
  - _Acceptance criteria: NS-1.4, NS-7.2, NS-8.1, NS-8.2, NS-8.3, NS-8.4_

<!-- phase-12-style-audit:start -->
### Better Specs style audit

- Scope: `src`
- Specs scanned: 127
- Style issues: 78

| Category               | Count |
| ---------------------- | ----: |
| global dispatchEvent   |     1 |
| long description       |     1 |
| mock usage             |    17 |
| no situation           |    56 |
| opaque boolean matcher |     3 |

<details>
<summary>Findings</summary>

- `src/__tests__/factories/factories.builder.spec.ts` — no when/with/without situation describe
- `src/__tests__/fixtures/list_stats.fixture.spec.ts` — no when/with/without situation describe
- `src/__tests__/helpers/testing.electrobun_view.mock.spec.ts` — no when/with/without situation describe
- `src/__tests__/helpers/testing.react.helper.spec.ts` — no when/with/without situation describe
- `src/__tests__/helpers/testing.seed.spec.ts` — no when/with/without situation describe
- `src/__tests__/helpers/testing.tmp.spec.ts` — no when/with/without situation describe
- `src/__tests__/helpers/view_navigation.harness.util.spec.ts` — no when/with/without situation describe
- `src/__tests__/helpers/view_navigation.harness_rows.util.spec.ts` — no when/with/without situation describe
- `src/__tests__/paths.spec.ts` — no when/with/without situation describe
- `src/core/constants/lang.const.spec.ts` — no when/with/without situation describe
- `src/core/domain/guards/entry.guard.spec.ts` — no when/with/without situation describe
- `src/core/domain/guards/entry_section.guard.spec.ts` — no when/with/without situation describe
- `src/core/domain/guards/lang.guard.spec.ts` — no when/with/without situation describe
- `src/core/domain/models/entries/factories/entry.factory.spec.ts` — no when/with/without situation describe
- `src/core/domain/models/entries/parsers/base_fields.parser.spec.ts` — no when/with/without situation describe
- `src/core/domain/models/entries/parsers/link.parser.spec.ts` — no when/with/without situation describe
- `src/core/domain/models/entries/parsers/meta.parser.spec.ts` — no when/with/without situation describe
- `src/core/domain/models/entries/parsers/notes.parser.spec.ts` — no when/with/without situation describe
- `src/core/domain/models/entries/parsers/source_document.parser.spec.ts` — no when/with/without situation describe
- `src/core/domain/models/entries/parsers/tags.parser.spec.ts` — no when/with/without situation describe
- `src/core/domain/models/entries/schemas/tags.schema.spec.ts` — no when/with/without situation describe
- `src/core/domain/models/knowledges/copy_text_for_entry.util.spec.ts` — no when/with/without situation describe
- `src/core/domain/models/knowledges/detail/doc.assembler.spec.ts` — no when/with/without situation describe
- `src/core/domain/models/knowledges/detail/doc.bookmark.parser.spec.ts` — no when/with/without situation describe
- `src/core/domain/models/knowledges/detail/doc.cheat.parser.spec.ts` — no when/with/without situation describe
- `src/core/domain/models/knowledges/detail/doc.command.parser.spec.ts` — no when/with/without situation describe
- `src/core/domain/models/knowledges/detail/doc.task.parser.spec.ts` — no when/with/without situation describe
- `src/core/domain/models/knowledges/detail/notes.parser.spec.ts` — no when/with/without situation describe
- `src/core/domain/models/knowledges/detail/youtube.parser.spec.ts` — no when/with/without situation describe
- `src/core/domain/models/knowledges/factories/knowledge.factory.spec.ts` — no when/with/without situation describe
- `src/core/domain/models/sources/parsers/source_location.parser.spec.ts` — no when/with/without situation describe
- `src/core/helpers/entry_action/entry_action_primary_secondary.util.spec.ts` — no when/with/without situation describe
- `src/core/helpers/entry_action/entry_action_records_visit.util.spec.ts` — no when/with/without situation describe
- `src/core/helpers/entry_action/entry_action_row_hint.util.spec.ts` — no when/with/without situation describe
- `src/core/helpers/entry_action/entry_action_shortcut_key.util.spec.ts` — no when/with/without situation describe
- `src/core/helpers/frecency/bump_frecency.util.spec.ts` — no when/with/without situation describe
- `src/core/helpers/path.helper.spec.ts` — no when/with/without situation describe
- `src/core/validation/typebox.helper.spec.ts` — no when/with/without situation describe
- `src/shared/logging/console.logger.spec.ts` — no when/with/without situation describe
- `src/shared/logging/app_log_verbosity.spec.ts` — no when/with/without situation describe
- `src/shared/logging/logtape.adapter.spec.ts` — no when/with/without situation describe
- `src/shared/utils/crc32.spec.ts` — no when/with/without situation describe
- `src/shell/app/app.spec.ts` — no when/with/without situation describe
- `src/shell/app/app.spec.ts` — uses mock, spyOn, or mock.module
- `src/shell/app/config/config.loader.spec.ts` — no when/with/without situation describe
- `src/shell/app/db/entry.repository.spec.ts` — no when/with/without situation describe
- `src/shell/app/db/entry.repository.spec.ts` — opaque boolean matcher (use readable matcher)
- `src/shell/app/db/frecency.repository.spec.ts` — no when/with/without situation describe
- `src/shell/app/db/import.service.spec.ts` — no when/with/without situation describe
- `src/shell/app/db/task.repository.spec.ts` — no when/with/without situation describe
- `src/shell/app/db/task.repository.spec.ts` — opaque boolean matcher (use readable matcher)
- `src/shell/app/lib/app_list_query.util.spec.ts` — no when/with/without situation describe
- `src/shell/app/lib/app_list_stats_for_filters.util.spec.ts` — no when/with/without situation describe
- `src/shell/app/lib/app_preview_fetch.util.spec.ts` — no when/with/without situation describe
- `src/shell/app/lib/app_preview_fetch.util.spec.ts` — uses mock, spyOn, or mock.module
- `src/shell/app/lib/app_tag_suggest.util.spec.ts` — no when/with/without situation describe
- `src/shell/app/lib/app_task_yaml.util.spec.ts` — no when/with/without situation describe
- `src/shell/main/helpers/error.helper.spec.ts` — no when/with/without situation describe
- `src/shell/main/helpers/error.helper.spec.ts` — uses mock, spyOn, or mock.module
- `src/shell/main/main.spec.ts` — no when/with/without situation describe
- `src/shell/main/rpc/host.spec.ts` — uses mock, spyOn, or mock.module
- `src/shell/main/rpc/schemas.spec.ts` — no when/with/without situation describe
- `src/shell/renderer/actions/build_entry_action_panel.util.spec.ts` — uses mock, spyOn, or mock.module
- `src/shell/renderer/components/actions/command_palette.component.spec.tsx` — uses mock, spyOn, or mock.module
- `src/shell/renderer/components/shared/sync_toast.component.spec.tsx` — uses mock, spyOn, or mock.module
- `src/shell/renderer/hooks/list/list_sync_message_handlers.util.spec.ts` — uses mock, spyOn, or mock.module
- `src/shell/renderer/hooks/list/use_command_palette.hook.spec.tsx` — opaque boolean matcher (use readable matcher)
- `src/shell/renderer/hooks/list/use_command_palette.hook.spec.tsx` — uses mock, spyOn, or mock.module
- `src/shell/renderer/hooks/list/use_filter_dropdown_stats.hook.spec.tsx` — uses mock, spyOn, or mock.module
- `src/shell/renderer/hooks/list/use_list_page_stats_sync.hook.spec.tsx` — uses mock, spyOn, or mock.module
- `src/shell/renderer/hooks/list/use_list_selection.hook.spec.tsx` — uses mock, spyOn, or mock.module
- `src/shell/renderer/hooks/list/use_record_detail_visit.hook.spec.tsx` — uses mock, spyOn, or mock.module
- `src/shell/renderer/hooks/list/use_view_navigation.hook.spec.tsx` — uses mock, spyOn, or mock.module
- `src/shell/renderer/hooks/list/use_view_navigation_record_visit.hook.spec.tsx` — uses mock, spyOn, or mock.module
- `src/shell/renderer/hooks/list/use_window_view_nav_keys.hook.spec.tsx` — uses global dispatchEvent
- `src/shell/renderer/pages/detail/detail.page.spec.tsx` — uses mock, spyOn, or mock.module
- `src/shell/renderer/pages/settings/settings.page.spec.tsx` — uses mock, spyOn, or mock.module
- `src/shell/renderer/utils/list/view_reducer.util.spec.ts` — list -> split', () => expect(viewReducer('list', 'ADVANCE')): description > 40 chars

</details>
<!-- phase-12-style-audit:end -->

## Phase 13 — Explicit subject convention

**Goal:** Make the object or action under test obvious in every touched spec.
Use the Better Specs subject idea without adding an RSpec-style API.

**Suggested commit command:**

```sh
git commit -m "$(cat <<'EOF'
test(specs): Make spec subjects explicit

Changes:
- Add subject aliases and subject helpers to ambiguous specs
- Normalise component specs around Subject and renderSubject
- Record cohesive multi-export modules that keep namespace subjects

Why:
- Makes each spec file easier to scan
- Prevents unrelated subjects from drifting into one spec
EOF
)"
```

- [x] 13.1 Inventory subject clarity.
  - Identify specs with vague subject names, component specs without
    `Subject` / `renderSubject`, service specs without `makeSubject`, and
    cohesive multi-export module specs that can use `import * as subject`.
  - Execute exactly:

    ```sh
    rg -n "describe\\(['\\\"](utils|helpers|validation|misc|common|index|shared)['\\\"]" src -g '*.spec.ts' -g '*.spec.tsx'
    rg -n "import \\* as [A-Za-z0-9_]+ from" src -g '*.spec.ts' -g '*.spec.tsx'
    rg -n "render\\(<[A-Z]|render\\(React\\.createElement" src/shell/renderer -g '*.spec.tsx'
    rg -n "new [A-Z][A-Za-z0-9_]+\\(" src -g '*.spec.ts' -g '*.spec.tsx'
    mise run test:spec-style -- --scope=src --format=markdown --update-ledger
    ```

  - Expected result: record subject-convention candidates in the Phase 12 audit
    block or this phase's notes before editing code.
  - _Acceptance criteria: NS-1.3, NS-1.4, NS-2.4, NS-2.5, NS-2.10, NS-2.11,
    NS-2.12_

- [x] 13.2 Normalise cohesive utility specs.
  - For cohesive multi-export modules, prefer
    `import * as subject from './module'` and nested exported-function
    `describe` blocks.
  - For single-export function specs, use
    `import { exportedName as subject } from './module'` only when it makes the
    action under test clearer than calling the function by name.
  - Start with `src/shell/main/window/placement.util.spec.ts`.
  - Execute exactly:

    ```sh
    bun test src/shell/main/window/placement.util.spec.ts
    mise run test:spec-style -- --scope=src/shell/main --format=markdown --update-ledger
    mise run test:spec-style -- --scope=src/shell/main --strict
    ```

  - Expected result: the placement spec has a clear module or function subject,
    nested exported-function groups if needed, and no unrelated behavior in the
    same spec file.
  - _Acceptance criteria: NS-2.4, NS-2.5, NS-2.7, NS-2.10, NS-2.11, NS-2.12_

- [x] 13.3 Normalise renderer component specs.
  - Alias the component under test as `Subject` when it improves readability.
  - Use `renderSubject()` for repeated render setup.
  - Keep BDD situation setup in the nested `describe` block and use
    `factoryFor(...)` for recurring project-shaped props.
  - Start with
    `src/shell/renderer/components/detail/dependency_graph.component.spec.tsx`.
  - Execute exactly:

    ```sh
    bun test src/shell/renderer/components/detail/dependency_graph.component.spec.tsx
    mise run test:spec-style -- --scope=src/shell/renderer --format=markdown --update-ledger
    mise run test:spec-style -- --scope=src/shell/renderer --strict
    ```

  - Expected result: the component under test is identifiable as `Subject`, the
    render action is named `renderSubject()`, and repeated prop setup uses
    registered factories or documented variants.
  - _Acceptance criteria: NS-2.4, NS-2.5, NS-2.10, NS-3.1, NS-5.2, NS-5.5,
    NS-5.6_

- [x] 13.4 Normalise services, hooks, and classes.
  - Use `makeSubject()` for constructed classes, services, and hooks where
    repeated construction would otherwise hide the subject.
  - Use `let subject: Type` with `beforeEach` only for mutable lifecycle setup
    that must be recreated per example.
  - Execute exactly:

    ```sh
    mise run test:spec-style -- --scope=src/core --format=markdown --update-ledger
    mise run test:spec-style -- --scope=src/shared --format=markdown --update-ledger
    mise run test:spec-style -- --scope=src/shell/app --format=markdown --update-ledger
    mise run test:spec-style -- --scope=src/shell/renderer --format=markdown --update-ledger
    bun test src/core src/shared src/shell/app src/shell/renderer
    ```

  - Expected result: no touched spec relies on anonymous construction inside
    every `it()` when a subject helper would make the tested object clearer.
  - _Acceptance criteria: NS-2.4, NS-2.5, NS-2.10, NS-3.1, NS-8.1_

- [x] 13.5 Close the subject convention pass.
  - Run final subject and style checks.
  - Execute exactly:

    ```sh
    mise run test:spec-style -- --scope=src --format=markdown --update-ledger
    mise run test:spec-style -- --scope=src --strict
    mise run test:spec-audit
    bun test
    git diff --check
    bash .agents/skills/app-quality-gate/scripts/gate.sh
    ```

  - Expected result: all commands are green, or each remaining explicit-subject
    exception is recorded with path, category, and reason.
  - _Acceptance criteria: NS-1.4, NS-2.10, NS-2.11, NS-2.12, NS-7.2, NS-8.1,
    NS-8.2, NS-8.4_

## Phase 14 — Audit finding burn-down

**Goal:** Close the remaining `test:spec-style` findings by category. Do not
mark a category complete because findings are documented. A category is complete
only when it has zero findings or every remaining path is listed as a narrow
intentional exception with a reason.

**Suggested commit command:**

```sh
git commit -m "$(cat <<'EOF'
test(specs): Burn down style audit findings

Changes:
- Close remaining no-describe and no-situation findings
- Replace remaining boolean, long-description, and test() findings
- Record only path-specific intentional exceptions

Why:
- Prevents documented audit findings from masquerading as completed work
- Gives the Better Specs cleanup an auditable finish line
EOF
)"
```

- [x] 14.1 Capture the finding baseline.
  - Run the style audit and paste the category counts into the Phase 12
    machine-owned block.
  - Execute exactly:

    ```sh
    mise run test:spec-style -- --scope=src --format=markdown --update-ledger
    mise run test:spec-style -- --scope=src --format=markdown
    ```

  - Expected result: record current counts for:
    - specs with no `describe` block;
    - specs with no `when` / `with` / `without` situation block;
    - `.toBe(true)` / `.toBe(false)` candidates;
    - long descriptions;
    - `test()` imports or calls;
    - any other reported category.
  - _Acceptance criteria: NS-1.3, NS-1.4, NS-9.1_

- [x] 14.2 Close specs with no `describe` block.
  - Fix every reported spec by adding a subject `describe` block, or record a
    path-specific exception with a reason.
  - Work by layer in this order: `src/__tests__`, `src/core`, `src/shared`,
    `src/shell/app`, `src/shell/main`, `src/shell/renderer`.
  - Execute exactly after each layer that has changed files:

    ```sh
    mise run test:spec-style -- --scope=src/__tests__ --format=markdown --update-ledger
    bun test src/__tests__

    mise run test:spec-style -- --scope=src/core --format=markdown --update-ledger
    bun test src/core

    mise run test:spec-style -- --scope=src/shared --format=markdown --update-ledger
    bun test src/shared

    mise run test:spec-style -- --scope=src/shell/app --format=markdown --update-ledger
    bun test src/shell/app

    mise run test:spec-style -- --scope=src/shell/main --format=markdown --update-ledger
    bun test src/shell/main

    mise run test:spec-style -- --scope=src/shell/renderer --format=markdown --update-ledger
    bun test src/shell/renderer
    ```

  - Execute exactly before checking this item:

    ```sh
    mise run test:spec-style -- --scope=src --format=markdown --update-ledger
    ```

  - Expected result: the global audit reports zero unresolved "no describe"
    findings.
  - _Acceptance criteria: NS-2.4, NS-2.5, NS-2.10, NS-9.1, NS-9.2_

- [x] 14.3 Close specs with no situation block.
  - Fix every reported spec by adding meaningful `when`, `with`, or `without`
    situation groups, or record a path-specific exception with a reason.
  - Do not add empty wrapper contexts. Move shared context setup into the
    situation block when it helps future examples.
  - Work by layer in this order: `src/__tests__`, `src/core`, `src/shared`,
    `src/shell/app`, `src/shell/main`, `src/shell/renderer`.
  - Execute exactly after each layer that has changed files:

    ```sh
    mise run test:spec-style -- --scope=src/__tests__ --format=markdown --update-ledger
    bun test src/__tests__

    mise run test:spec-style -- --scope=src/core --format=markdown --update-ledger
    bun test src/core

    mise run test:spec-style -- --scope=src/shared --format=markdown --update-ledger
    bun test src/shared

    mise run test:spec-style -- --scope=src/shell/app --format=markdown --update-ledger
    bun test src/shell/app

    mise run test:spec-style -- --scope=src/shell/main --format=markdown --update-ledger
    bun test src/shell/main

    mise run test:spec-style -- --scope=src/shell/renderer --format=markdown --update-ledger
    bun test src/shell/renderer
    ```

  - Execute exactly before checking this item:

    ```sh
    mise run test:spec-style -- --scope=src --format=markdown --update-ledger
    ```

  - Expected result: the global audit reports zero unresolved "no situation"
    findings.
  - _Acceptance criteria: NS-2.3, NS-2.4, NS-2.10, NS-9.1, NS-9.3_

- [x] 14.4 Close boolean matcher findings.
  - Replace opaque boolean expressions with readable matchers.
  - Keep direct boolean API assertions only when the path and reason are
    recorded as an intentional exception.
  - Execute exactly:

    ```sh
    mise run test:spec-style -- --scope=src --format=markdown --update-ledger
    bun test
    ```

  - Expected result: the global audit reports zero unresolved boolean matcher
    findings.
  - _Acceptance criteria: NS-3.3, NS-9.1, NS-9.4_

- [x] 14.5 Close long-description findings.
  - Split long `it()` descriptions into nested subject or situation
    `describe` blocks and shorter behavior text.
  - Keep a long description only when the full text is intentionally user-facing
    or otherwise path-specifically justified.
  - Execute exactly:

    ```sh
    mise run test:spec-style -- --scope=src --format=markdown --update-ledger
    bun test
    ```

  - Expected result: the global audit reports zero unresolved long-description
    findings.
  - _Acceptance criteria: NS-2.8, NS-9.1, NS-9.4_

- [x] 14.6 Close `test()` import and call findings.
  - Convert remaining behavior examples from `test()` to `it()`.
  - Remove `test` from `bun:test` imports unless a path-specific exception is
    recorded.
  - Execute exactly:

    ```sh
    mise run test:spec-style -- --scope=src --format=markdown --update-ledger
    bun test
    ```

  - Expected result: the global audit reports zero unresolved `test()` findings.
  - _Acceptance criteria: NS-2.1, NS-2.2, NS-9.1, NS-9.4_

- [x] 14.7 Close remaining reported categories.
  - Fix or path-specifically except any remaining style audit category not
    covered above, such as global event or mock findings.
  - Execute exactly:

    ```sh
    mise run test:spec-style -- --scope=src --format=markdown --update-ledger
    bun test
    ```

  - Expected result: every remaining finding is either fixed or listed with a
    path, category, and reason.
  - _Acceptance criteria: NS-1.4, NS-4.2, NS-6.3, NS-9.1_

- [x] 14.8 Final strict closure.
  - Run the complete final verification.
  - Execute exactly:

    ```sh
    mise run test:spec-style -- --scope=src --format=markdown --update-ledger
    mise run test:spec-style -- --scope=src --strict
    mise run test:spec-audit
    bun test
    git diff --check
    bash .agents/skills/app-quality-gate/scripts/gate.sh
    ```

  - Expected result: strict style audit is green, or strict mode explicitly
    accepts only the path-specific exceptions recorded in the ledger.
  - _Acceptance criteria: NS-7.2, NS-8.1, NS-8.2, NS-9.1, NS-9.5_

## Expected files to update

The follow-up implementation must update these files:

- `assets/docs/specs/normalise-specs/tasks.md` — inventory counts, checked
  items, accepted exceptions, and verification evidence.
- Source specs reported by the `test()` scan — convert behavior examples to
  `it()` and add subject `describe` groups where missing.
- Source specs reported by the long-description scan — split descriptions with
  nested situation `describe` blocks.
- Source specs with subject-only `describe` blocks and condition-heavy `it()`
  names — add nested BDD situation `describe` blocks. Start with
  `src/shell/main/window/placement.util.spec.ts`.
- Source specs with BDD situation blocks whose setup still lives entirely inside
  `it()` bodies — move shared immutable setup into the situation block and use
  local action helpers where useful. Start with
  `src/shell/main/window/placement.util.spec.ts`.
- Source specs with hard-coded project data or primitive magic values — use
  `factoryFor(...)` for recurring project-shaped data, geometry, renderer props,
  RPC payloads, config, and typed events; use local builders only for one-file
  incidental primitive values. Start with
  `src/shell/renderer/components/detail/dependency_graph.component.spec.tsx`
  and `src/shell/main/window/placement.util.spec.ts`.
- Source specs with ambiguous subjects — make the object under test explicit
  with `subject`, `Subject`, `makeSubject()`, `renderSubject()`, or a
  context-specific action helper. Start with
  `src/shell/main/window/placement.util.spec.ts` and
  `src/shell/renderer/components/detail/dependency_graph.component.spec.tsx`.
- Source specs reported by the boolean matcher scan — replace only opaque
  boolean expressions; record direct boolean API assertions that intentionally
  stay as `.toBe(true)` or `.toBe(false)`.
- `assets/guides/TESTING_GUIDE.md` — keep the explicit-subject and
  factory-first rules coherent with this spec.
- `assets/guides/FISHERY_GUIDE.md` — keep factory promotion, named variants,
  transient data, associations, and `afterBuild` examples coherent with this
  spec.
- `mise.toml` — add the canonical `test:spec-style` task with `usage` flags.
- `tools/test_spec_style_audit.ts` — optional internal helper only if the mise
  task remains the documented entrypoint for Phase 12 commands.

These files should not need more changes unless implementation reveals a policy
gap:

- `assets/docs/specs/normalise-specs/requirements.md` — update only if a new
  testing rule appears beyond the explicit-subject and factory-first rules.
- `assets/docs/specs/normalise-specs/design.md` — update only if the
  implementation strategy changes beyond the guided manual cleanup and audit
  task.
