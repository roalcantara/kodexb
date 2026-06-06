<!-- markdownlint-disable-file -->
# End-to-end regression suite - Requirements

## Overview

The first release needs a trustworthy e2e suite that protects working app
behavior from regressions without requiring manual retesting after every
increment. The suite SHALL start from the current app architecture:

- Electrobun desktop shell with a React renderer.
- Elysia + Eden Treaty RPC as the app transport.
- `tools/preview/server.script.ts` as the existing browser-runnable harness for the
  real renderer bundle plus real RPC.
- Existing SDD/EARS specs under `assets/docs/specs/` as the behavioral source
  map.
- Existing `bun:test` unit/component coverage as the lower-level safety net.

The e2e suite is not intended to replace unit tests. It SHALL cover the main
release-critical user journeys that are expensive to retest manually and easy
to break through UI, RPC, or persistence changes.

Normative implementation contracts (seed data, Gherkin phrases, quality score
schema) live beside this spec:

- [`fixture-manifest.md`](fixture-manifest.md)
- [`step-catalog.md`](step-catalog.md)
- [`scenario-scores.schema.json`](scenario-scores.schema.json)

## Non-goals

- The first implementation SHALL NOT automate every historical requirement in
  `assets/docs/specs/`.
- The first implementation SHALL NOT add CodeceptJS unless a later task proves
  Playwright BDD cannot express a needed desktop-preview flow.
- The first implementation SHALL NOT require the developer's real
  `~/.config/kb` data.
- The suite SHALL NOT launch or mutate the packaged Electrobun app until the
  preview harness is deterministic and release-useful.

## Requirement syntax

- **WHEN** event, **THEN** the system **SHALL** response.
- **IF** precondition, **THEN** the system **SHALL** response.
- **WHEN** event **AND** condition, **THEN** the system **SHALL** response.

## Requirements

### R1 - Deterministic e2e harness

**User story:** As a release maintainer, I want e2e runs to use known data and
known app state, so that failures indicate app regressions rather than local
machine drift.

#### Acceptance criteria

1. WHEN the e2e suite starts, THEN the system SHALL create an isolated temporary
   app config, sources directory, and SQLite database for the run.
2. WHEN the preview server boots for e2e, THEN it SHALL load the isolated config
   instead of the developer's default `~/.config/kb` paths.
3. WHEN any browser e2e command runs (`mise run test e2e …`, Playwright
   `webServer`, or `preview_with_fixture.support.ts`), THEN the child process
   SHALL set `NODE_ENV=test` and SHALL use the **test** configuration profile
   described in `design.md#database-environments-structural-isolation`.
4. WHEN `bun dev` or Electrobun dev starts without `NODE_ENV=test`, THEN the app
   SHALL use the **development** profile (`~/.config/kb/…`) and SHALL NOT read
   the e2e test database.
5. WHEN `NODE_ENV` is `test`, THEN `loadConfig()` SHALL NOT default to
   `~/.config/kb/config.yaml` unless an explicit maintainer override is documented.
6. WHEN the isolated fixture is seeded, THEN it SHALL include at least one
   bookmark, one command, one cheat, and three tasks with different status,
   priority, due-date, tag, and dependency shapes.
7. WHEN fixture seeding fails, THEN the e2e run SHALL fail with a clear setup
   error and SHALL NOT skip the scenario.
8. WHEN the suite finishes, THEN temporary e2e state SHALL be removed unless an
   explicit debug environment variable preserves it.

### R2 - BDD source of truth

**User story:** As a developer, I want release behavior expressed as Gherkin,
so that specs, tests, and regression reports describe the same workflows.

#### Acceptance criteria

1. WHEN a release-critical flow is selected for e2e coverage, THEN the behavior
   SHALL be represented in a `.feature` file before or alongside automation.
2. WHEN Gherkin scenarios are written, THEN they SHALL use business-visible
   language and avoid CSS selectors, implementation class names, or RPC method
   names in scenario text.
3. WHEN a scenario maps to an existing SDD requirement, THEN the feature file
   SHALL reference the spec slug and requirement id in tags or comments.
4. WHEN a scenario has multiple data variants, THEN the suite SHALL use
   `Scenario Outline` with `Examples` rather than duplicating prose.
5. WHEN a scenario is not yet automatable, THEN it SHALL be tagged `@todo` and
   excluded from release gates until implemented.
6. WHEN this planning phase is complete, THEN canonical `.feature` files SHALL
   already exist under `assets/features/e2e/` for the P0 and P1 scenario
   families so implementor agents do not decide the product-level regression
   scope.

### R3 - Release smoke coverage

**User story:** As a maintainer, I want the shortest high-signal gate to protect
the features users hit most often, so that every PR can catch app-breaking
regressions quickly.

#### Acceptance criteria

1. WHEN `mise run test e2e --smoke` runs, THEN it SHALL execute the P0 smoke
   scenarios in Chromium through Playwright.
2. WHEN the seeded app opens, THEN the list page SHALL render rows for all major
   entry types.
3. WHEN the user searches, THEN matching rows SHALL update and the footer SHALL
   report the filtered count.
4. WHEN the user opens the filter overlay, THEN type, tag, and task-view filters
   SHALL affect the result list.
5. WHEN the user navigates with keyboard arrows, THEN the app SHALL move through
   list, split, full-detail, split, and list states without losing focus.
6. WHEN the user opens an entry detail, THEN the detail panel SHALL show the
   selected entry metadata and body content.
7. WHEN the user triggers the primary copy/open action for a selected entry,
   THEN the app SHALL show a success toast or observable action result.
8. WHEN a smoke scenario fails, THEN the runner SHALL retain the Playwright
   trace and HTML report in `tmp/`.

### R4 - Expanded regression coverage

**User story:** As a product owner, I want the full regression suite to grow in
priority order, so that the most-used and highest-risk flows are protected
before long-tail features.

#### Acceptance criteria

1. WHEN `mise run test e2e --regression` runs, THEN it SHALL include all P0 and P1
   scenarios that are implemented.
2. WHEN task management scenarios run, THEN they SHALL cover create, edit,
   delete, status cycle, priority cycle, reorder, and dependency visibility.
3. WHEN sync scenarios run, THEN they SHALL cover import progress, completion
   state, empty source directory behavior, and invalid source-file reporting.
4. WHEN settings scenarios run, THEN they SHALL cover reading config, editing
   paths and page size, saving, resetting, and refreshing list state after save.
5. WHEN command palette scenarios run, THEN they SHALL cover entry-scoped,
   clipboard, source, library, and app sections.
6. WHEN frecency scenarios run, THEN they SHALL verify that detail visits and
   copy/open actions influence list ordering.
7. WHEN shortcuts scenarios run, THEN they SHALL cover quick-lookup overlay
   open/close, text and chord search, collision glyphs, overlay filter modal,
   shortcut type filter, keymap detail, chord detail navigation, and FTS search
   by binding action (see [`shortcuts/requirements.md`](../shortcuts/requirements.md)
   S-10).
8. WHEN visual polish is release-critical for a flow, THEN the suite SHALL add
   targeted screenshot assertions only for stable, named UI surfaces.

### R5 - Screenplay-shaped automation

**User story:** As a future maintainer, I want step definitions to stay small
and reusable, so that adding Gherkin coverage does not create a brittle selector
maze.

#### Acceptance criteria

1. WHEN step definitions are implemented, THEN each step SHALL delegate to
   Screenplay-style tasks, questions, or abilities instead of embedding long
   Playwright scripts.
2. WHEN selectors are needed, THEN they SHALL live in one interaction layer and
   prefer role/name locators or stable app-owned test ids over CSS classes.
3. WHEN a flow requires app setup, THEN setup SHALL use the e2e fixture harness
   and public RPC/UI surfaces rather than direct renderer internals.
4. WHEN a step needs to observe state, THEN it SHALL assert visible UI or public
   RPC outcomes, not private React state.
5. IF the chosen Screenplay library conflicts with Playwright BDD fixtures,
   THEN the implementation SHALL keep the Screenplay pattern locally without
   forcing an incompatible runner.

### R6 - EARS-to-backlog inventory

**User story:** As a planner, I want existing EARS requirements converted into
an ordered e2e backlog, so that new tests trace back to intended behavior
instead of ad hoc browsing.

#### Acceptance criteria

1. WHEN implementation begins, THEN the agent SHALL scan
   `assets/docs/specs/*/requirements.md`, `design.md`, and `tasks.md` for
   release-facing flows and map them to backlog entries.
2. WHEN backlog entries are created, THEN each entry SHALL include priority,
   source spec, flow name, proposed feature file, implementation status, and
   validation command.
3. WHEN two specs describe the same user journey, THEN the backlog SHALL keep
   one canonical scenario family and reference both source specs.
4. WHEN a flow is unit-covered but not e2e-covered, THEN the backlog SHALL state
   why the flow does or does not need browser-level coverage.
5. WHEN backlog priority is assigned, THEN the suite SHALL rank daily-use and
   release-risk flows above long-tail or admin-only flows.

### R7 - Project gate integration

**User story:** As a maintainer, I want e2e commands to fit the project quality
workflow, so that release confidence is repeatable locally and in CI.

#### Acceptance criteria

1. WHEN package or mise commands are added, THEN they SHALL use the existing
   `mise run test ...` task surface and keep package scripts minimal.
2. WHEN the e2e smoke suite is stable, THEN it SHALL become part of the release
   review path or a documented pre-release gate.
3. WHEN the full regression suite is slower than the smoke suite, THEN it SHALL
   remain separately runnable and may run on schedule, pre-release, or manual CI.
4. WHEN e2e dependencies are added, THEN `bun.lock` SHALL be updated and the
   change SHALL pass `bun install --frozen-lockfile` in CI.
5. WHEN the e2e work is declared complete, THEN
   `bash .agents/skills/app-quality-gate/scripts/gate.sh`,
   `mise run test e2e --smoke`, and `git diff --check` SHALL pass.

### R8 - Documentation and handoff

**User story:** As the next agent, I want a bounded handoff with explicit task
order, so that implementation can proceed without redoing the investigation.

#### Acceptance criteria

1. WHEN this planning work is complete, THEN `assets/docs/specs/e2e/` SHALL
   contain `requirements.md`, `design.md`, `tasks.md`, and `handoff.md`.
2. WHEN implementation starts, THEN the agent SHALL execute `tasks.md` in order
   and update task evidence as work lands.
3. WHEN implementation changes production test infrastructure, THEN the agent
   SHALL load `app-context`, `app-testing`, and `app-quality-gate` first.
4. WHEN implementation changes Playwright, Gherkin, or Screenplay files, THEN
   the agent SHALL use `playwright-bdd-gherkin-syntax` as a reference and keep
   project-owned testing rules authoritative.
5. WHEN a task is complete, THEN the agent SHALL record the validation commands
   and results in `tasks.md` before moving to the next task.

### R9 - Measurable e2e quality

**User story:** As a reviewer, I want objective quality checks for e2e
implementation, so that passing tests are not mistaken for trustworthy tests.

#### Acceptance criteria

1. WHEN an e2e task is reviewed, THEN the reviewer SHALL score it against the
   quality model in `design.md#quality-model`.
2. WHEN a P0 scenario is implemented, THEN it SHALL receive a total quality
   score of at least 85 out of 100.
3. WHEN a P1 scenario is implemented, THEN it SHALL receive a total quality
   score of at least 80 out of 100.
4. WHEN a scenario score is below threshold, THEN the task SHALL remain
   incomplete even if the Playwright command exits 0.
5. WHEN a scenario asserts behavior, THEN the assertion SHALL prove user-visible
   outcome or public RPC/persistence outcome, not only that an element exists.
6. WHEN the backlog is updated, THEN it SHALL report P0/P1 scenario coverage as
   implemented, todo, deferred native, or intentionally unit-only.

### R10 - Historical quality metrics

**User story:** As a release maintainer, I want e2e quality metrics recorded
over time, so that progress and degradation are visible across increments.

#### Acceptance criteria

1. WHEN smoke or regression e2e commands run in CI or release review, THEN the
   system SHALL write a machine-readable metrics report for that run.
2. WHEN a metrics report is written, THEN it SHALL include scenario counts by
   priority and status, automation percentages, average quality score by
   priority, below-threshold scenarios, weak assertion count, conditional skip
   count, known flake count, duration, commit SHA, branch, command, and
   timestamp.
3. WHEN a release baseline is created, THEN the baseline SHALL be stored in a
   stable repo path so future runs can compare against it.
4. WHEN a run is compared with the current baseline, THEN the report SHALL call
   out improvements, neutral changes, and regressions.
5. WHEN P0 automation percentage decreases, a P0 score drops below threshold,
   weak P0 assertions appear, smoke skips appear, or known smoke flakes appear,
   THEN the comparison SHALL mark the run as a release-blocking degradation.
6. WHEN P1 coverage or quality decreases without an accepted deferral note,
   THEN the comparison SHALL mark the run as a regression-suite degradation.
7. WHEN a metric cannot be computed, THEN the report SHALL state `unknown` with
   a reason instead of silently omitting the metric.

### R11 - Cross-feature e2e acceptance

**User story:** As a spec author, I want every release-facing feature and
user-visible refactor to declare e2e acceptance criteria up front, so browser
regressions are caught in the same increment as unit tests.

#### Acceptance criteria

1. WHEN a new feature spec is created under `assets/docs/specs/<slug>/`, THEN
   `requirements.md` SHALL include at least one requirement block (or AC
   clauses) that trace to Gherkin scenarios under `assets/features/e2e/`.

2. WHEN a feature ships UI, keyboard, or persistence behavior, THEN
   `tasks.md` SHALL include an e2e task (or explicit cross-link to
   `assets/docs/specs/e2e/tasks.md`) that lists feature files, fixture manifest
   updates, and step-catalog phrases before the feature is marked beta-ready.

3. WHEN e2e scenarios are planned, THEN authors SHALL update
   `fixture-manifest.md` and `step-catalog.md` in the same PR series as the
   `.feature` files (scenarios MAY start with `@todo` until automation lands).

4. WHEN a refactor changes release-critical list, detail, palette, filter, sync,
   or settings flows, THEN the owning spec SHALL add or update e2e scenarios
   before the refactor is declared complete unless the maintainer documents an
   intentional unit-only deferral in `tasks.md` evidence.

5. WHEN `@spec:<slug>` tags are used, THEN each tag SHALL map to exactly one
   feature spec slug (do not reuse `@spec:shortcuts` for command-palette-only
   scenarios).

6. WHEN a feature's e2e work completes, THEN implementors SHALL record pass
   evidence (`mise run test e2e --smoke` and/or `--regression`) in both the
   feature `tasks.md` and the e2e `tasks.md` phase entry.

7. WHEN a maintainer or agent records a release validation step (manual
   dogfood, preview-server walkthrough, integration sanity), THEN that step
   SHALL appear as at least one numbered AC in the feature `requirements.md`
   and/or a Gherkin scenario under `assets/features/e2e/` before the feature
   is marked beta-ready. Task-only or handoff-only checks are not sufficient.
   See [`assets/docs/specs/README.md`](../README.md#verifiable-acceptance-no-orphan-checks).
