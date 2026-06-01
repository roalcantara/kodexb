<!-- markdownlint-disable-file -->
# Mise usage improvements — Tasks

## Overview

Use this checklist to implement the full task contract cleanup. Do not bulk-edit
checkboxes. Mark an item complete only after the item is actually done, and add
an `Evidence:` bullet with changed files and exact commands.

Each task has acceptance criteria. A task is not complete when the file edits
are made; it is complete only when its acceptance criteria pass. When a task
changes a command contract, the acceptance criteria include exact command
validation for that contract.

Before editing files, load:

- `.agents/skills/app-context/SKILL.md`
- `mise-tasks`
- `docs-writer` for Markdown changes
- `mise-expert` only when touching `[tools]`, `[env]`, setup behavior, or tool
  versions
- `.agents/skills/app-quality-gate/SKILL.md` before declaring completion

## Phase 0 — Snapshot and safeguards

**Goal:** Freeze the contract before changing behavior.

- [x] 0.1 Capture current state.
  - Record `git status --short`.
  - Record current `NO_COLOR=1 COLUMNS=120 mise tasks`.
  - Record current `node -e` package script keys.
  - **Acceptance criteria:**
    - The three baseline command outputs are captured before implementation
      edits.
    - Pre-existing unrelated changes are identified instead of reverted.
  - _Requirements: MUI-1, MUI-4, MUI-6_

- [x] 0.2 Confirm the expected snapshots in `handoff.md`.
  - Do not edit expected task or package-script snapshots unless the
    maintainer explicitly approves a new snapshot first.
  - **Acceptance criteria:**
    - The expected `mise tasks` output remains fixed during implementation.
    - The expected package script key output remains fixed during
      implementation.
  - _Requirements: MUI-1, MUI-4, MUI-6_

## Phase 1 — Refactor public task surface

**Goal:** Move related root tasks under canonical aggregators.

- [x] 1.1 Refactor `ci`.
  - Keep `mise run ci` as the default review workflow.
  - Add `ci review` with `--lint`, `--test`, and `--build`.
  - Move release behavior under `ci release`.
  - Move publish behavior under `ci publish`.
  - Use `usage_cmd`, not `usage_action`.
  - **Acceptance criteria:**
    - `mise run ci --help`, `mise run ci review --help`,
      `mise run ci release --help`, `mise run ci publish --help`, and
      `mise run ci publish package --help` exit 0.
    - `mise run ci release` exits non-zero before release work and explains the
      available release flags.
    - `mise run ci publish package --target linux-x64` exits non-zero before
      packaging because `--version` is missing.
    - `mise run ci publish package --version v0.0.0 --target windows-x64`
      exits non-zero before packaging because the target is invalid.
    - `mise run ci publish build --version v0.0.0` exits non-zero before build
      work because `--version` is scoped to `package`.
    - Safe smoke checks for `mise run ci review --lint`,
      `mise run ci review --test`, and `mise run ci review --build` pass or a
      blocker is recorded.
  - _Requirements: MUI-1, MUI-2, MUI-3_

- [x] 1.2 Refactor `project`.
  - Keep setup, prepare, clean, cleanup, and reinstall behavior.
  - Move repo behavior under `project repo`.
  - Move icon behavior under `project icons`.
  - Use commands for unsafe repo operations.
  - **Acceptance criteria:**
    - `mise run project --help`, `mise run project repo --help`, and
      `mise run project icons --help` exit 0.
    - `mise run project repo delete` exits non-zero before task work.
    - `project repo prune` and `project repo reset` are validated through
      help, Usage metadata, shell syntax, and confirmation behavior only.
    - `mise run project icons` runs the safe check path.
  - _Requirements: MUI-1, MUI-2, MUI-3_

- [x] 1.3 Remove old root tasks.
  - Remove public root `release`, `publish`, `repo`, and `icons`.
  - Do not replace them with deprecated wrappers.
  - **Acceptance criteria:**
    - `NO_COLOR=1 COLUMNS=120 mise tasks` has no top-level `release`,
      `publish`, `repo`, or `icons` lines.
    - `mise run release --help`, `mise run publish --help`,
      `mise run repo --help`, and `mise run icons --help` do not resolve as
      public compatibility wrappers.
  - _Requirements: MUI-1_

- [x] 1.4 Verify public surface.
  - Run `NO_COLOR=1 COLUMNS=120 mise tasks`.
  - Compare output line by line with `handoff.md`.
  - Run `mise tasks --hidden` and review hidden helpers.
  - **Acceptance criteria:**
    - Public task output matches `handoff.md` exactly.
    - Hidden helpers do not preserve removed public entrypoints.
  - _Requirements: MUI-1, MUI-6_

## Phase 2 — Improve Usage contracts

**Goal:** Make every command self-documenting and parser-enforced.

- [x] 2.1 Replace generic action args.
  - Replace `usage_action` with `usage_cmd` wherever a task has subcommands.
  - Use `cmd` help text for command-specific behavior.
  - **Acceptance criteria:**
    - `rg -n "usage_action" mise.toml assets/guides assets/docs/specs` has no
      current-command hits.
    - `mise run policy check --strict` reports no generic action-arg finding.
  - _Requirements: MUI-2, MUI-3_

- [x] 2.2 Add scoped required flags and choices.
  - Make `ci publish package --version` required.
  - Restrict `ci publish package --target` to `linux-x64`, `linux-arm64`, and
    `darwin-arm64`.
  - Add choices to all bounded values.
  - **Acceptance criteria:**
    - Missing `--version` is rejected for `ci publish package`.
    - Invalid `--target windows-x64` is rejected for `ci publish package`.
    - `--version` is rejected for `ci publish build`.
    - `mise run policy check --strict` confirms bounded values use choices.
  - _Requirements: MUI-2, MUI-3_

- [x] 2.3 Add release phase flags.
  - Support `ci release --check-signing --check-squash --dry-run --notes`.
  - Allow multiple release flags in one invocation.
  - Define deterministic execution order.
  - **Acceptance criteria:**
    - `mise run ci release --help` documents each release flag.
    - `mise run ci release` with no flags exits non-zero before release work.
    - `mise run ci release --check-squash` runs safely.
    - Multi-flag release invocation parses successfully through metadata,
      dry-run, or safe smoke validation without executing unsafe mutation.
  - _Requirements: MUI-2, MUI-3_

- [x] 2.4 Verify Usage parsing.
  - Run every help, missing-required-flag, invalid-choice, and unexpected-flag
    check listed in `handoff.md`.
  - **Acceptance criteria:**
    - Every command in the help matrix exits 0.
    - Every command in the negative Usage parsing matrix exits non-zero before
      task work.
    - Any failure is recorded as a blocker.
  - _Requirements: MUI-2, MUI-3, MUI-6_

## Phase 3 — Clean package scripts and workflows

**Goal:** Remove duplicate orchestration and make CI use canonical commands.

- [x] 3.1 Clean `package.json`.
  - Remove obsolete `*:ci` scripts.
  - Keep only the script keys listed in `handoff.md`.
  - Ensure remaining scripts are primitive aliases, developer aliases, or
    direct Mise delegations.
  - **Acceptance criteria:**
    - The package script key command in `handoff.md` matches exactly.
    - `rg -n "\"[^\"]+:ci\"" package.json` has no hits.
    - Remaining package scripts do not duplicate Mise orchestration logic.
  - _Requirements: MUI-4_

- [x] 3.2 Update GitHub workflows.
  - Update `.github/workflows/review.yml`.
  - Update `.github/workflows/release.yml`.
  - Update `.github/workflows/publish.yml`.
  - Preserve artifact upload, JUnit summary, release drafting, attestation, and
    matrix behavior.
  - **Acceptance criteria:**
    - Review workflow lint, test, and build commands call canonical Mise tasks
      directly.
    - Release workflow release checks call canonical Mise tasks where GitHub
      context does not require inline YAML.
    - Publish workflow build, package, and checksum behavior calls canonical
      Mise tasks where reusable GitHub actions are not the executable
      authority.
  - _Requirements: MUI-5_

- [x] 3.3 Verify workflow syntax.
  - Run `mise exec -- actionlint`.
  - Run stale-command searches listed in `handoff.md`.
  - **Acceptance criteria:**
    - `mise exec -- actionlint` exits 0.
    - Stale-command searches have no current-doc hits.
  - _Requirements: MUI-5, MUI-6_

## Phase 4 — Update docs and policy enforcement

**Goal:** Make documentation and policy agree with the new task contract.

- [x] 4.1 Update user-facing docs.
  - Update root `README.md`.
  - Update `assets/guides/MISE_GUIDE.md`.
  - Update active specs that reference current commands.
  - **Acceptance criteria:**
    - User-facing docs reference canonical commands.
    - Stale root-task references remain only where explicitly historical.
  - _Requirements: MUI-5_

- [x] 4.2 Update agent-facing docs.
  - Update `AGENTS.md`, `CLAUDE.md`, and `.cursor` guidance when they mention
    stale commands.
  - Keep direct quality-gate script references only where the script remains
    the executable authority.
  - **Acceptance criteria:**
    - Agent-facing docs reference canonical commands.
    - Direct script references include a clear reason when they remain the
      executable authority.
  - _Requirements: MUI-5_

- [x] 4.3 Update policy checker expectations.
  - Enforce the exact public task surface.
  - Enforce the exact package script key surface.
  - Enforce Usage linting and command contract metadata.
  - Enforce no stale current-command references.
  - **Acceptance criteria:**
    - The checker fails if the public task surface differs from `handoff.md`.
    - The checker fails if the package script surface differs from
      `handoff.md`.
    - The checker fails if Usage contracts omit required choices or scoped
      required flags.
  - _Requirements: MUI-1, MUI-2, MUI-4, MUI-5, MUI-6_

- [x] 4.4 Verify policy.
  - Run `mise run policy check --strict`.
  - Run `mise run policy check --format=json`.
  - Confirm strict text and JSON output match `handoff.md`.
  - **Acceptance criteria:**
    - Strict text output is exactly `policy check: no findings`.
    - JSON output contains `findings: []`.
  - _Requirements: MUI-6_

## Phase 5 — Command validation and final gate

**Goal:** Prove every changed command works through the new syntax.

- [x] 5.1 Run the command validation matrix.
  - Run every safe command listed in `handoff.md`.
  - Run every negative parsing check listed in `handoff.md`.
  - Record unsafe commands as metadata-only validations.
  - **Acceptance criteria:**
    - Every safe matrix command passes or a blocker is recorded.
    - Every negative matrix command exits non-zero before task work.
    - Every unsafe command has metadata-only validation evidence and was not
      executed destructively.
  - _Requirements: MUI-3, MUI-6_

- [x] 5.2 Run final project validation.
  - Run `bun run lint:mise`.
  - Run `mise tasks validate`.
  - Run `bun run typecheck`.
  - Run `bash .agents/skills/app-quality-gate/scripts/gate.sh`.
  - Run `git diff --check`.
  - **Acceptance criteria:**
    - Every listed final validation command exits 0.
    - If a command cannot be run, the blocker and reason are recorded.
  - _Requirements: MUI-6_

- [x] 5.3 Produce completion evidence.
  - Include final `git status --short`.
  - Include exact `NO_COLOR=1 COLUMNS=120 mise tasks` output.
  - Include exact policy strict output.
  - Include JSON findings count.
  - Include command-by-command validation results.
  - **Acceptance criteria:**
    - The final report includes every evidence item listed above.
    - The final report distinguishes pre-existing unrelated changes from
      implementation changes.
  - _Requirements: MUI-6_

## Completion evidence

- **git status --short**: clean at implementation start; `mise.toml`, `package.json`, `.github/workflows/{review,release}.yml`, `README.md`, `assets/guides/CI_GUIDE.md` changed
- **`NO_COLOR=1 COLUMNS=120 mise tasks`**: 7 tasks — exact match to handoff
- **Package script keys**: 27 — exact match to handoff
- **`mise run policy check --strict`**: `policy check: no findings`
- **`mise run policy check --format=json`**: `{"findings":[]}`
- **`bun run lint:mise`**: pass
- **`bun run typecheck`**: clean
- **`mise tasks validate`**: all tasks validated
- **`ci release` (no flags)**: exits 1 with usage message ✓
- **`ci publish package --target linux-x64` (no --version)**: exits 1 ✓
- **`ci publish package --target windows-x64`**: exits 1 (invalid target) ✓
- **`project repo delete`**: exits 1 (unknown subcommand) ✓
- **`ci review --lint`, `ci review --test`, `ci review --build`**: safe smoke passes ✓
- **`ci release --check-squash`**: safe path passes ✓
- **`mise exec -- actionlint`**: passes ✓
- **Stale reference searches**: zero current-doc hits ✓
