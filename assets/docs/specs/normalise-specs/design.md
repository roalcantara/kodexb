<!-- markdownlint-disable-file -->
# Normalise source specs — Design

## Overview

This spec normalises source tests against
[`assets/guides/TESTING_GUIDE.md`](../../../guides/TESTING_GUIDE.md). The work
is intentionally phased because there are more than one hundred source spec
files and several active feature streams can touch the same areas.

The implementation will first create an inventory, then apply low-risk
normalisations, then handle higher-risk areas such as mocks, SQLite setup, and
renderer event semantics. Each phase must preserve behavior and run focused
tests before the repository quality gate.

## Architecture

The normalisation work has three layers:

1. **Inventory layer:** A markdown ledger in `tasks.md` records the files,
   categories, exceptions, commands, and progress. This is the source of truth
   for the implementation pass.
2. **Mechanical cleanup layer:** Safe text-level changes such as `context`
   aliases, `test()` calls, missing subject `describe` blocks, "should"
   descriptions, long descriptions, and readable matcher replacements.
3. **Behavioral cleanup layer:** Test rewrites that can affect semantics:
   mocks, database setup, fixture usage, renderer event dispatch, async error
   coverage, and table-driven case extraction.

The task list owns sequencing. The testing guide owns policy. If the two
disagree, update this spec before implementing around the conflict.

## Components and interfaces

### Spec inventory

The implementer will produce a compact ledger in `tasks.md` rather than a new
script. The ledger records:

- total spec count,
- layer counts,
- categories found,
- touched file groups,
- accepted exceptions,
- focused verification commands,
- quality gate status.

This keeps the first pass simple and reviewable. A future enforcement phase can
turn recurring patterns into `ast-grep` or lint rules after the manual cleanup
proves the rule is correct.

### Normalisation rules

The following rules are considered safe when the spec behavior remains the same:

- import test APIs from `bun:test`,
- use `it()` for behavior examples instead of `test()`,
- use subject `describe` blocks and nested `describe` blocks instead of
  top-level behavior examples or `context`,
- name subject `describe` blocks after public exported functions, classes,
  React components, hooks, RPC routes, or clear module concepts,
- make the subject explicit with `subject`, `Subject`, `makeSubject()`,
  `renderSubject()`, or a context-specific action helper when the spec would
  otherwise require reading every assertion to find the tested object,
- use `import * as subject from './module'` for cohesive multi-export modules
  and nested `describe` blocks for each exported public surface,
- use `.` for TypeScript static/factory methods and `#` for instance methods,
- remove "should" from `describe` and `it` text,
- use present-tense behavior wording,
- replace opaque boolean matcher expressions with readable matchers,
- use table-driven tests for repeated equivalent input/output cases,
- keep test data minimal and prefer `factoryFor(...)` for recurring
  project-owned shapes, exported types, and repeated scenarios.

The following rules require behavioral care:

- replacing mocks with dependency injection or test doubles,
- converting disk or shared database setup to `:memory:`,
- replacing fixture-heavy data setup with factories,
- promoting repeated local builders into Fishery factories or named variants,
- changing renderer tests to target production event surfaces,
- adding missing invalid, empty, boundary, or async error cases.

### Exceptions

An exception is allowed when it is explicit and narrow. Examples:

- YAML fixtures are allowed for import, sync, or file-format integration specs.
- Multiple expectations are allowed in slow integration specs with expensive
  setup.
- A narrow mock is allowed for external, slow, or non-deterministic behavior.
- A production refactor needed to remove a mock can be recorded as follow-up
  instead of folded into this cleanup.

Exceptions are recorded in the task ledger with the file path and reason.

`test()` is not an accepted style exception by itself. Bun supports it, but the
project standard is `it()` because this repository follows Better Specs
wording. Keep `test()` only when a specific file-level reason is recorded and
approved in the ledger.

## Data model

Use this lightweight ledger row shape in `tasks.md`:

| Field | Meaning |
| --- | --- |
| Layer | `core`, `shared`, `shell/app`, `shell/main`, `renderer`, or `test-helper` |
| Files | Count or path group touched in the phase |
| Categories | Testing-guide categories addressed |
| Exceptions | Approved exception count and reason summary |
| Verification | Focused command and quality gate result |

No new runtime data model is required.

## Error handling

The implementer must stop rather than guess when:

- a test appears to assert obsolete behavior,
- a mock replacement requires production design changes,
- a fixture looks like an integration contract rather than test convenience,
- a renderer test cannot target the production event surface,
- a phase would touch too many unrelated files for one commit,
- a phase or command becomes unexpectedly slow compared with the phase scope.

The report must include the file path, the current behavior, the proposed
decision, elapsed command details when relevant, and the smallest safe next
step.

## Testing strategy

Every implementation phase runs:

1. Focused `bun test` commands for touched directories or files.
2. `mise run test:spec-audit` when the phase touches co-location or coverage
   expectations and the task exists.
3. `bash .agents/skills/kb-quality-gate/scripts/gate.sh` before marking the
   phase complete.

The current `test:spec-audit` task checks co-location only. It does not enforce
Better Specs style such as `it()` usage, subject `describe` blocks, or short
descriptions. Treat style scans in `tasks.md` as required evidence until a
future guard explicitly covers them.

The `test:spec-style` audit must not be closed by pasting a finding list into
the ledger. A finding category is complete only when the strict audit is green
for that category, or when every remaining path is recorded as a narrow
intentional exception. "Documented but not fixed" is an open task, not a closed
task.

Renderer-risky phases may also run `mise run e2e:preview` when the environment
supports it. If it cannot run, record the exact blocker.

## Decision: Guided manual normalisation before enforcement

**Context:** The repository has many specs and active feature work. Adding strict
guards before cleanup could block unrelated work or encode incorrect rules.

**Options considered:**

1. Audit-only report. Pros: fastest and safest. Cons: leaves all execution
   choices for later agents.
2. Guided manual normalisation. Pros: clear phases, concrete acceptance
   criteria, and no premature enforcement. Cons: requires discipline from the
   implementer.
3. Fully enforced normalisation. Pros: prevents regressions immediately. Cons:
   high risk of false positives before the manual cleanup identifies legitimate
   exceptions.

**Decision:** Use guided manual normalisation now, with an optional final
enforcement phase.

**Rationale:** This gives the next agent enough structure to move quickly while
keeping behavior and existing feature work safe.
