<!-- markdownlint-disable-file -->
# End-to-end regression suite - Tasks

## Task rules

- Execute tasks in order.
- Do not change production feature behavior while implementing the harness
  unless a task explicitly requires a testability hook.
- Keep one artifact type per file and follow suffix naming for every TypeScript
  file.
- Prefer project-owned skills over generic examples:
  `app-context`, `app-testing`, `app-quality-gate`, and, for Gherkin,
  `bdd-gherkin-specification`, `playwright-bdd-gherkin-syntax`, and
  `cucumber-gherkin` as references. Install `playwright-bdd-step-definitions`
  via `mise run skill install` when writing step defs.
- Normative e2e contracts: `fixture-manifest.md`, `step-catalog.md`,
  `scenario-scores.schema.json` (see `design.md`).
- Record evidence under each completed task before moving on.

## Phase 1 - Inventory and dependency spike

- [ ] **T1.0 - Retire or port legacy preview smoke**
  - `e2e/preview_list_nav.e2e.spec.ts` uses stale `.theme-*` selectors and
    skips on empty DB — violates R1/R3.
  - Either delete it or port keyboard navigation to Gherkin before T4.4.
  - Update selectors to `getByRole` + `.cmp-*` if kept temporarily.
  - Evidence: file removed or superseded; no skip-on-empty in release path.
  - _Requirements: R1, R3_

- [ ] **T1.1 - Confirm exact BDD dependency set**
  - Verify the current `playwright-bdd` version, install command, generated
    output convention, and tag command shape.
  - Verify whether `@cucumber/screenplay` integrates cleanly with
    Playwright BDD fixtures or whether to keep a local Screenplay-shaped layer.
  - Decide explicitly that CodeceptJS is deferred unless the spike proves a
    gap.
  - Evidence: dependency versions, commands tried, and final dependency list.
  - Document decision: local Screenplay vs `@cucumber/screenplay` package.
  - _Requirements: R2, R5, R7_

- [ ] **T1.5 - Publish fixture manifest**
  - Keep `assets/docs/archive/e2e/fixture-manifest.md` aligned with seed code.
  - Seed implementation MUST use exact titles/tags from the manifest.
  - Evidence: manifest cross-check against `assets/features/e2e/*.feature`.
  - _Requirements: R1, R2_

- [ ] **T1.6 - Publish step catalog**
  - Keep `assets/docs/archive/e2e/step-catalog.md` aligned with feature files.
  - Every Gherkin phrase in features MUST appear in the catalog before T3.3.
  - Evidence: diff review; no orphan steps.
  - _Requirements: R2, R5, R9_

- [ ] **T1.2 - Build the EARS-to-e2e backlog**
  - Scan `assets/docs/archive/*/{requirements,design,tasks}.md`.
  - Map release-facing flows to priority, source specs, proposed feature files,
    and implementation status.
  - Deduplicate overlapping scenarios across specs.
  - Store the inventory in task evidence or `assets/docs/archive/e2e/backlog.md`
    if it is too large.
  - Evidence: backlog file or table plus command/search notes.
  - _Requirements: R4, R6_

- [ ] **T1.3 - Normalize e2e command names**
  - Add or plan `mise run test e2e --smoke`,
    `mise run test e2e --regression`, `mise run test e2e --debug`,
    `mise run test e2e --metrics-report`,
    `mise run test e2e --metrics-compare`, and
    `mise run test e2e --write-baseline` under the existing `test` task.
  - Keep package scripts as thin implementation details only where useful.
  - Verify `mise run test --help` documents the commands.
  - Evidence: command output and modified files.
  - _Requirements: R7_

- [ ] **T1.4 - Review canonical feature files**
  - Review the checked-in `assets/features/e2e/*.feature` files before automation.
  - Add missing P0/P1 scenarios only if the source specs prove a release-facing
    gap.
  - Do not replace product-level scenarios with implementor-local wording.
  - Evidence: feature file list and any scenario changes made.
  - _Requirements: R2, R6, R9_

## Phase 2 - Deterministic preview harness

- [ ] **T2.1 - Add isolated e2e fixture setup**
  - Create support code that makes a temp config, sources directory, and DB.
  - Seed bookmark, command, cheat, and task variants required by
    `design.md#deterministic-harness`.
  - Preserve debug artifacts only when an explicit env var is set.
  - Evidence: fixture paths, cleanup behavior, and focused unit/spec command.
  - _Requirements: R1_

- [ ] **T2.2 - Route preview server through isolated config**
  - Update `tools/preview/server.script.ts` to accept a test config path through a
    clearly named env var.
  - Keep default behavior unchanged for normal preview usage.
  - Add tests or a focused smoke proving default and env-config paths.
  - Evidence: focused command plus preview smoke result.
  - _Requirements: R1, R7_

- [ ] **T2.3 - Remove empty-DB skips from release smoke**
  - Replace skip-based smoke behavior with deterministic seeded expectations.
  - Keep an explicit debug-only path if useful, but do not let release smoke
    pass with zero rows.
  - Evidence: `mise run test e2e --smoke` fails on seed failure and passes on
    valid seed.
  - _Requirements: R1, R3_

- [ ] **T2.4 - Structural test profile via `NODE_ENV=test`**
  - See `design.md#database-environments-structural-isolation` and worktree
    evidence when implemented on `feat-e2e-regression`.
  - _Requirements: R1 (AC3–AC5)_

## Phase 3 - BDD skeleton

- [ ] **T3.1 - Add Playwright BDD configuration**
  - Add dependencies, config, generated-output location, and scripts needed for
    `bddgen`.
  - Ensure generated files do not violate repo naming or lint rules.
  - Update `bun.lock`.
  - Evidence: `bun install --frozen-lockfile`, `bddgen`, and typecheck results.
  - _Requirements: R2, R7_

- [ ] **T3.2 - Create Gherkin authoring conventions**
  - Keep the existing `assets/features/e2e/` files aligned with tags from
    `design.md#bdd-conventions`.
  - Keep `assets/guides/BDD_GUIDE.md` and
    `assets/guides/BDD_GHERKIN_GUIDE.md` aligned with the KB e2e layout.
  - Include comments or tags linking scenarios to source specs.
  - Remove `@todo` only when the scenario has working automation and quality
    score evidence.
  - Evidence: guide review notes plus feature lint/generation result.
  - _Requirements: R2, R6, R9_

- [ ] **T3.3 - Add Screenplay-shaped support layer**
  - Add actors, abilities, interactions, tasks, and questions with suffixes from
    `design.md#screenplay-conventions`.
  - Centralize locator policy.
  - Keep step definitions thin.
  - Evidence: focused tests or generated Playwright execution for one scenario.
  - _Requirements: R5_

- [ ] **T3.4 - Scenario IDs and quality sidecar**
  - Register scenario IDs from `step-catalog.md` in metrics tooling.
  - Add `tools/metrics/baselines/e2e-quality/scenario-scores.json` validated by
    `scenario-scores.schema.json` in the same directory.
  - Score scenarios during T6.4 using `design.md#quality-model`.
  - Evidence: sample sidecar entry for one P0 scenario.
  - _Requirements: R9, R10_

## Phase 4 - P0 smoke scenarios

- [ ] **T4.1 - App boot and seeded list**
  - Automate the seeded app boot and assert all major entry types are visible or
    discoverable.
  - Evidence: `mise run test e2e --smoke`.
  - _Requirements: R3_

- [ ] **T4.2 - Search and footer count**
  - Automate a search that narrows rows and verifies footer count/status.
  - Evidence: `mise run test e2e --smoke`.
  - _Requirements: R3_

- [ ] **T4.3 - Filter overlay**
  - Automate type, tag, and task-view filters using Gherkin examples.
  - Evidence: `mise run test e2e --smoke`.
  - _Requirements: R3_

- [ ] **T4.4 - Keyboard navigation**
  - Port the current `preview_list_nav.e2e.spec.ts` behavior to Gherkin.
  - Assert list -> split -> full detail -> split -> list state and focus.
  - Retire or keep the old spec only if it does not duplicate the BDD scenario.
  - Evidence: `mise run test e2e --smoke`.
  - _Requirements: R3_

- [ ] **T4.5 - Detail and primary action**
  - Automate detail metadata/body assertions and one primary copy/open action.
  - Use observable UI/RPC result, not private state.
  - Evidence: `mise run test e2e --smoke`.
  - _Requirements: R3, R5_

## Phase 5 - P1 regression scenarios

- [ ] **T5.1 - Command palette**
  - Cover palette open/close, search, sections, and selected-entry actions.
  - Evidence: `mise run test e2e --regression`.
  - _Requirements: R4_

- [ ] **T5.2 - Task management**
  - Cover create, edit, delete, status cycle, priority cycle, reorder, and
    dependency visibility.
  - Verify YAML write-back via public app behavior or isolated source files.
  - Evidence: `mise run test e2e --regression`.
  - _Requirements: R4_

- [ ] **T5.3 - Settings**
  - Cover config read, path/page-size edits, save, reset, and list refresh after
    save.
  - Evidence: `mise run test e2e --regression`.
  - _Requirements: R4_

- [ ] **T5.4 - Sync**
  - Cover import progress, completion, empty directory behavior, and invalid
    source-file reporting.
  - Evidence: `mise run test e2e --regression`.
  - _Requirements: R4_

- [ ] **T5.5 - Frecency**
  - Cover detail visit/action side effects on ordering with deterministic rows.
  - Evidence: `mise run test e2e --regression`.
  - _Requirements: R4_

## Phase 6 - Reporting and CI integration

- [x] **T6.1 - Artifact reporting**
  - Traces/HTML/JUnit under `tmp/e2e/` and `tmp/playwright-report/` via `playwright.config.ts`.
  - Evidence: `CI=1 bun run e2e:smoke` writes `tmp/e2e/junit.xml`; failed-run traces under `tmp/e2e/test-results/`.
  - _Requirements: R3, R7_

- [x] **T6.2 - Pre-release gate integration**
  - **Decision:** keep default `gate.sh` stage 3 as HTTP preview smoke (fast). Document release-prep commands instead of blocking every commit on 17-scenario BDD smoke (~20s+ fixture build).
  - Release prep: `mise run test e2e --smoke`; pre-merge optional: `mise run test e2e --regression`.
  - _Requirements: R7_

- [x] **T6.3 - Final validation**
  - Evidence (2026-05-29, worktree `feat-e2e-regression`):
    - `CI=1 bun run e2e:smoke` → **17/17 passed** (~20s)
    - `CI=1 bun run e2e:regression` → **18/18 passed** (~18s)
    - Root fix: `parseLogVerbosity` / `renderer_build_env` safe without `process` in preview bundle.
  - _Requirements: R7, R8_

- [x] **T6.4 - Score implemented scenarios**
  - Sidecar: `tools/metrics/baselines/e2e-quality/scenario-scores.json` — 27 scenarios, qualityScore 3, 100% P0/P1 tagged.
  - _Requirements: R9_

- [x] **T6.5 - Persist and compare quality metrics**
  - `tools/metrics/harnesses/e2e-quality/e2e_metrics.script.ts` → `tmp/e2e/metrics/latest.json`; baseline at `tools/metrics/baselines/e2e-quality/quality-baseline.json`.
  - `mise run test e2e --metrics-report` / `--metrics-compare` / `--write-baseline`.
  - Evidence: `bun run e2e:metrics-report && bun run e2e:write-baseline` on green regression run.
  - _Requirements: R10_

- [x] **T6.5b - Document transitional e2e commands**
  - Updated `assets/guides/TESTING_GUIDE.md` §Preview e2e workflow.
  - _Requirements: R7_

## Suggested commit sequence

1. `test(e2e): Add deterministic preview fixture`
2. `test(e2e): Add BDD harness`
3. `test(e2e): Cover release smoke flows`
4. `test(e2e): Add regression scenarios`
5. `test(e2e): Record quality metrics`
6. `ci(e2e): Wire release smoke gate`

## Phase 7 - Shortcuts feature (P1)

Cross-spec with [`shortcuts/`](../shortcuts/tasks.md) Task 21 and
[requirements S-10](../shortcuts/requirements.md#requirement-s-10-end-to-end-acceptance).
Depends on shortcuts Tasks 12–15 (renderer surfaces) and e2e T2.4 (test profile).

- [x] **T7.1 - Fixture and manifest**
  - Add `shortcuts/release.yml` to the isolated e2e sources directory.
  - Update [`fixture-manifest.md`](fixture-manifest.md) entries (already
    normative — implement seed in `e2e/support/seed_fixture.support.ts`).
  - Evidence: import produces four shortcut entries and expected
    `entry_bindings` collision pairs. `SHORTCUTS_YAML` in
    [`seed_fixture.support.ts`](../../../e2e/support/seed_fixture.support.ts)
    seeds `release-macos`, `release-amethyst`, `release-vscode`, `release-browser`
    with the `meta+p` and `meta+space` collision pairs the overlay scenarios assert.
  - _Requirements: shortcuts S-10 AC2; e2e R11_

- [x] **T7.2 - Feature files and step catalog**
  - Keep [`assets/features/e2e/shortcuts_overlay.feature`](../../../assets/features/e2e/shortcuts_overlay.feature)
    and [`shortcuts_list.feature`](../../../assets/features/e2e/shortcuts_list.feature)
    in sync with [`step-catalog.md`](step-catalog.md).
  - Implement `e2e/steps/shortcuts.steps.ts` and Screenplay tasks/questions.
  - Evidence: `bddgen` includes `@spec:shortcuts` scenarios — `bun run e2e:bddgen`
    emits both `shortcuts_list.feature.spec.js` and `shortcuts_overlay.feature.spec.js`
    under `e2e/.generated/assets/features/e2e/` now that `@todo` is removed.
  - _Requirements: shortcuts S-10 AC1, AC4; e2e R2, R11_

- [x] **T7.3 - Overlay regression**
  - Automate overlay open/close, text search, chord conflicts card, hard
    collision glyph, overlay filter modal (remove `@todo` when green).
  - Evidence: `CI=1 bun run e2e:regression` — all 5 overlay scenarios green
    (`Quick-lookup opens focused and closes with escape`, `Text search finds a
    binding by action name`, `Chord search shows conflicts-first card for a shared
    chord`, `Hard collision row shows warning glyph`, `Overlay filter modal limits
    results to one app`). `@todo` removed from
    [`shortcuts_overlay.feature`](../../../assets/features/e2e/shortcuts_overlay.feature).
  - _Requirements: shortcuts S-4; e2e R4 AC7_

- [x] **T7.4 - List and detail regression**
  - Automate type filter, FTS search by action, keymap ↔ chord detail navigation.
  - Include at least one `@smoke` scenario (`shortcuts_list` type filter).
  - Evidence: `CI=1 bun run e2e:smoke` (20/20) and `CI=1 bun run e2e:regression`
    (26/26). All 3 list scenarios carry `@smoke @regression`. `@todo` removed from
    [`shortcuts_list.feature`](../../../assets/features/e2e/shortcuts_list.feature).
  - _Requirements: shortcuts S-5; e2e R3, R4 AC7_

- [x] **T7.5 - Traceability and scores**
  - Update `scenario-scores.json` for shortcuts scenarios.
  - Record evidence in [`shortcuts/tasks.md`](../shortcuts/tasks.md) Task 21.
  - Evidence: 8 `@spec:shortcuts` scenarios recorded as `passing` in
    [`scenario-scores.json`](scenario-scores.json); shortcuts Task 20 + Task 21
    checkboxes updated with command output and the production fixes that unblocked
    each scenario.
  - _Requirements: e2e R9, R11_
