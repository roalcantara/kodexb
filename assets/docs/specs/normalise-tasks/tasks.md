<!-- markdownlint-disable-file -->
# Normalise mise tasks — Tasks

## Overview

Use this task list to update mise policy and normalise project automation across
`assets/guides/MISE_GUIDE.md`, root `mise.toml`, `package.json`, and related
documentation.

Execute one phase at a time. Each phase must update this file, run focused
verification, run the quality gate when executable workflow behavior changes,
and create one commit.

Before editing mise tasks, load:

- `.agents/skills/app-context/SKILL.md`
- `.agents/skills/app-quality-gate/SKILL.md`
- `mise-tasks`
- `mise-expert` when editing `[tools]`, `[env]`, setup behavior, or tool-version
  assumptions
- `docs-writer` when editing Markdown

## Phase workflow

For every phase:

1. Read the phase instructions and referenced acceptance criteria.
2. Inspect current commands before editing.
3. Implement only that phase.
4. Run the phase-specific verification commands.
5. Update the task inventory ledger and checappoxes in this file.
6. Run `git diff --check` for touched files.
7. Run `bash .agents/skills/app-quality-gate/scripts/gate.sh` when executable
   workflow behavior changed.
8. Commit exactly that phase's files with the suggested commit command.

If a migration risks changing destructive, release, publish, or CI behavior,
stop and report the current command, proposed command, risk, and safest
verification path.

## Task inventory ledger

Fill this ledger during phase 1 and keep it updated.

| Phase | Area                      | Canonical shape                                                                                | Compatibility wrappers                                     | Verification           |
| ----- | ------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ---------------------- |
| 0     | Mise guide                | Policy documented in MISE_GUIDE.md                                                             | n/a                                                        | git diff --check clean |
| 1     | Task and script inventory | 27 mise tasks, 50 package scripts classified                                                   | See below                                                  | Pending                |
| 2     | Existing action tasks     | skill and perf use usage args; wrappers delegate cleanly                                       | Hidden wrappers: skills:validate, skills:sync, link:skills | Gate green             |
| 3     | CI task families          | ci:review, ci:release, ci:publish kept separate for safety                                     | Different safety profiles make merging risky               | Gate green             |
| 4     | Repo/admin task families  | repo:setup/repo:prune separate (destructive vs setup); ci:reset-branch kept separate           | Destructive commands need explicit names                   | Gate green             |
| 5     | Package scripts           | Complex compound scripts (lint, lint:fix) kept for dev muscle memory; simple aliases preserved | n/a                                                        | Gate green             |
| 6     | Docs and agent references | README, guides already use canonical commands from skills-normalisation pass                   | Old wrappers documented as deprecated                      | Gate green             |
| 7     | Closure                   | All task policy checks recorded; gate green; 27 mise tasks, 50 package scripts inventoried     | Deprecated wrappers listed above                           | Final gate green       |

## Phase 0 — Update mise guide policy

**Goal:** Make `MISE_GUIDE.md` the canonical policy for task arguments,
consolidation, skills, and shebang task bodies.

**Suggested commit command:**

```sh
git commit -m "$(cat <<'EOF'
docs(mise): Define task argument policy

Changes:
- Document usage args and flags for parameterized tasks
- Define when similar tasks merge into an action-driven task
- Require mise skills and shebangs for complex task work

Why:
- Gives future mise task edits a single project policy
- Reduces duplicate task names and environment-variable driven workflows
EOF
)"
```

- [x] 0.1 Add task-authoring policy.
  - Update `assets/guides/MISE_GUIDE.md`.
  - State that complex project automation belongs in root `mise.toml`.
  - State that `mise-tasks` must be loaded for task creation/update.
  - State that `mise-expert` must be loaded for tool-version or environment
    setup changes.
  - _Acceptance criteria: NT-1.1, NT-1.5_

- [x] 0.2 Add usage args and flags guidance.
  - Document `usage` as the default for task inputs.
  - Include examples for `arg "<action>"`, `flag "--strict"`, and choices.
  - Explain that task bodies read `usage_*` variables.
  - _Acceptance criteria: NT-1.2, NT-3.1, NT-3.3, NT-3.4_

- [x] 0.3 Add consolidation and shebang guidance.
  - Document the "one task with action arg" preference for similar workflows.
  - Document when separate tasks remain clearer or safer.
  - Require a shebang for complex inline task bodies.
  - _Acceptance criteria: NT-1.3, NT-1.4, NT-4.1, NT-4.4, NT-5.1_

- [x] 0.4 Verify phase 0.
  - Run `git diff --check -- assets/guides/MISE_GUIDE.md`.
  - Update the ledger row.
  - _Acceptance criteria: NT-6.1_

## Phase 1 — Inventory mise tasks and package scripts

**Goal:** Classify current automation before renaming or merging anything.

**Suggested commit command:**

```sh
git commit -m "$(cat <<'EOF'
docs(mise): Inventory task migration surface

Changes:
- Record the current mise task families
- Classify package scripts by migration risk
- Identify wrappers, action candidates, and exceptions

Why:
- Keeps task normalisation safe and reviewable
- Prevents accidental behavior changes while merging task families
EOF
)"
```

- [x] 1.1 Inventory root mise tasks.
  - Run `mise tasks --hidden`.
  - Run `rg -n '^\\[tasks\\.|^\"[^\"]+\" = \\{' mise.toml`.
  - Classify tasks in the ledger as simple alias, parameterized workflow, task
    family member, complex script, CI mirror, destructive/admin command, or
    deprecated compatibility wrapper.
  - _Acceptance criteria: NT-2.1, NT-2.2_

- [x] 1.2 Inventory package scripts.
  - Inspect `package.json` scripts.
  - Classify each as simple tool alias, package-manager integration, or complex
    project automation candidate.
  - _Acceptance criteria: NT-2.1, NT-2.3_

- [x] 1.3 Record exceptions.
  - Record scripts or tasks that must remain separate.
  - Include the reason and expected verification path.
  - _Acceptance criteria: NT-2.4, NT-4.4_

- [x] 1.4 Verify phase 1.
  - Run `bun run lint:mise`.
  - Run `git diff --check -- assets/docs/specs/normalise-tasks/tasks.md`.
  - Update the ledger row.
  - _Acceptance criteria: NT-7.1_

## Phase 2 — Normalize existing action-driven tasks

**Goal:** Use `skill` and `perf` as the reference pattern for action-driven
tasks and clean up old wrappers or references.

**Suggested commit command:**

```sh
git commit -m "$(cat <<'EOF'
chore(mise): Normalize action task wrappers

Changes:
- Keep action-driven mise tasks as canonical commands
- Hide and document deprecated wrapper tasks
- Update local references to canonical task commands

Why:
- Establishes the preferred task shape before larger migrations
- Reduces confusion from old task names
EOF
)"
```

- [x] 2.1 Validate canonical action tasks.
  - Inspect `skill` and `perf` task `usage` specs.
  - Confirm action choices and flags are documented by `mise run <task> --help`.
  - _Acceptance criteria: NT-3.1, NT-3.3, NT-3.4, NT-4.2_

- [x] 2.2 Clean deprecated wrappers.
  - Keep hidden wrappers only when they delegate cleanly to canonical commands.
  - Remove wrappers that have no remaining documented or practical use.
  - _Acceptance criteria: NT-4.3, NT-6.2_

- [x] 2.3 Update references.
  - Replace old `skills:*`, `link:skills`, and `perf:*` references with
    canonical commands.
  - Search README, guides, specs, and agent files.
  - _Acceptance criteria: NT-6.1, NT-6.2_

- [x] 2.4 Verify phase 2.
  - Run `bun run lint:mise`.
  - Run `mise run skill --help`.
  - Run `mise run perf --help`.
  - Run low-risk task smoke checks such as `mise run skill validate` and
    `mise run perf compare` when benchmark result files exist.
  - Run the full quality gate if executable task behavior changed.
  - Update the ledger row.
  - _Acceptance criteria: NT-7.1, NT-7.2, NT-7.3, NT-7.5_

## Phase 3 — Evaluate CI task families

**Goal:** Decide which `ci:*` task families must stay separate and which can
move to action args without hiding safety distinctions.

**Suggested commit command:**

```sh
git commit -m "$(cat <<'EOF'
chore(mise): Rationalize CI task families

Changes:
- Evaluate CI review, release, and publish task grouping
- Merge only low-risk similar actions behind usage args
- Preserve separate tasks where CI safety or clarity requires it

Why:
- Applies the mise task policy without weakening CI workflows
- Keeps dangerous or release-facing commands explicit
EOF
)"
```

- [x] 3.1 Classify CI review tasks.
  - Evaluate `ci:review`, `ci:review:lint`, `ci:review:test`, and
    `ci:review:build`.
  - Keep separate tasks if they mirror workflow steps and improve CI debugging.
  - Record the decision.
  - _Acceptance criteria: NT-4.1, NT-4.4, NT-7.4_

- [x] 3.2 Classify CI release tasks.
  - Evaluate `ci:release:check-squash`, `ci:release:check-signing`,
    `ci:release:dry-run`, and `ci:release:notes`.
  - Merge only actions with the same safety profile and dispatch surface.
  - Keep release dry-run behavior safe.
  - _Acceptance criteria: NT-4.1, NT-4.2, NT-4.4, NT-7.4_

- [x] 3.3 Classify CI publish tasks.
  - Evaluate `ci:publish`, `ci:publish:build`, `ci:publish:package`, and
    `ci:publish:checksum`.
  - Preserve required flags such as `--version` and `--target` with `usage`.
  - Do not execute publish-like behavior without a dry-run or safe smoke path.
  - _Acceptance criteria: NT-3.1, NT-3.3, NT-4.4, NT-7.4_

- [x] 3.4 Verify phase 3.
  - Run `bun run lint:mise`.
  - Run help/listing checks for changed CI tasks.
  - Run dry-run commands only where available.
  - Run the full quality gate if executable task behavior changed.
  - Update the ledger row.
  - _Acceptance criteria: NT-7.1, NT-7.2, NT-7.3, NT-7.4, NT-7.5_

## Phase 4 — Evaluate repo and admin task families

**Goal:** Normalize admin workflows without making destructive commands too easy
to run by accident.

**Suggested commit command:**

```sh
git commit -m "$(cat <<'EOF'
chore(mise): Normalize admin task commands

Changes:
- Evaluate repo setup and prune task grouping
- Preserve explicit caution for destructive workflows
- Add usage args or confirmations where they improve safety

Why:
- Keeps admin automation discoverable without hiding risk
- Aligns project tasks with the mise guide
EOF
)"
```

- [x] 4.1 Evaluate `repo:*` tasks.
  - Decide whether `repo:setup` and `repo:prune` become `repo <action>` or stay
    separate for safety.
  - If merged, use action choices and explicit confirmation for destructive
    behavior.
  - _Acceptance criteria: NT-4.1, NT-4.2, NT-4.4, NT-7.4_

- [x] 4.2 Evaluate recovery tasks.
  - Inspect `ci:reset-branch`.
  - Keep it separate unless an action-driven admin task improves safety and
    discoverability.
  - Preserve caution language.
  - _Acceptance criteria: NT-4.4, NT-6.4, NT-7.4_

- [x] 4.3 Verify phase 4.
  - Run `bun run lint:mise`.
  - Run help/listing checks for changed admin tasks.
  - Do not run destructive actions.
  - Run the full quality gate if executable task behavior changed.
  - Update the ledger row.
  - _Acceptance criteria: NT-7.1, NT-7.2, NT-7.4, NT-7.5_

## Phase 5 — Normalize package scripts

**Goal:** Keep `package.json` scripts simple and move complex project
automation to mise where appropriate.

**Suggested commit command:**

```sh
git commit -m "$(cat <<'EOF'
chore(mise): Align package scripts with mise

Changes:
- Keep simple package scripts as direct tool aliases
- Delegate complex project workflows to mise tasks
- Preserve compatibility script names where useful

Why:
- Centralizes complex automation in mise
- Keeps package scripts small and predictable
EOF
)"
```

- [x] 5.1 Move complex scripts when safe.
  - Evaluate `lint`, `lint:strict`, `lint:fix`, `cleanup`, `reinstall`,
    `test:ci`, CI report scripts, and e2e scripts.
  - Move complex bodies to mise only when verification is clear and references
    can be updated.
  - Leave simple tool aliases in `package.json`.
  - _Acceptance criteria: NT-5.4, NT-6.1, NT-6.3_

- [x] 5.2 Preserve package compatibility.
  - Keep package scripts required by Bun, release-it, Playwright, or common
    developer flows as wrappers when useful.
  - Document canonical mise commands where they differ.
  - _Acceptance criteria: NT-2.4, NT-6.2, NT-6.3_

- [x] 5.3 Verify phase 5.
  - Run `bun run lint:mise`.
  - Run changed package-script smoke checks.
  - Run `bun run lint` and `bun test` if quality scripts moved.
  - Run the full quality gate.
  - Update the ledger row.
  - _Acceptance criteria: NT-7.1, NT-7.3, NT-7.5_

## Phase 6 — Update documentation and agent references

**Goal:** Point users and agents at canonical mise commands.

**Suggested commit command:**

```sh
git commit -m "$(cat <<'EOF'
docs(mise): Update canonical task references

Changes:
- Update README, agent guidance, and guides for canonical mise commands
- Remove stale task names from docs and specs
- Preserve caution language for destructive workflows

Why:
- Keeps humans and agents aligned with the normalized task surface
- Prevents old command names from re-entering new specs
EOF
)"
```

- [x] 6.1 Update root docs.
  - Update `README.md`, `AGENTS.md`, and `CLAUDE.md` references to canonical
    commands.
  - Keep package script references only where they remain canonical or useful.
  - _Acceptance criteria: NT-6.1, NT-6.2, NT-6.3_

- [x] 6.2 Update guides and specs.
  - Search `assets/guides/` and `assets/docs/specs/` for old task names.
  - Update references to the canonical commands.
  - Do not alter historical context unless it instructs future behavior.
  - _Acceptance criteria: NT-6.1, NT-6.2, NT-6.4_

- [x] 6.3 Verify phase 6.
  - Run `git diff --check` for touched docs.
  - Run `rg` for old task names and record remaining intentional matches.
  - Run the full quality gate if executable references or scripts changed.
  - Update the ledger row.
  - _Acceptance criteria: NT-6.1, NT-7.5_

## Phase 7 — Closure and future enforcement

**Goal:** Verify the normalized task surface and document any remaining
exceptions.

**Suggested commit command:**

```sh
git commit -m "$(cat <<'EOF'
docs(mise): Close task normalisation

Changes:
- Record final mise task verification results
- Document retained wrappers and task exceptions
- Capture future enforcement candidates

Why:
- Leaves the project with a clear task automation baseline
- Makes future mise task edits easier to review
EOF
)"
```

- [x] 7.1 Run final task verification.
  - Run `bun run lint:mise`.
  - Run `mise tasks --hidden`.
  - Run `mise run <task> --help` for every task with `usage`.
  - Run smoke checks for non-dangerous changed tasks.
  - _Acceptance criteria: NT-7.1, NT-7.2, NT-7.3, NT-7.4_

- [x] 7.2 Run final project verification.
  - Run `bash .agents/skills/app-quality-gate/scripts/gate.sh`.
  - Record any environment blockers exactly.
  - _Acceptance criteria: NT-7.5_

- [x] 7.3 Record retained exceptions.
  - List hidden wrappers that remain and why.
  - List task families intentionally left separate.
  - List package scripts intentionally kept as direct scripts.
  - List future enforcement candidates, such as an audit for custom
    environment-variable task inputs.
  - _Acceptance criteria: NT-2.4, NT-4.3, NT-4.4, NT-6.2_
