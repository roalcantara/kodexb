<!-- markdownlint-disable-file -->
# Mise usage policy — Tasks

## Overview

Use this task list to implement executable Mise and Usage policy enforcement.
The rollout is intentionally phased: document policy first, add a read-only
checker second, then refactor task families and make the checker blocking only
after current intentional exceptions are encoded.

Before editing executable task behavior, load:

- `.agents/skills/app-context/SKILL.md`
- `.agents/skills/app-quality-gate/SKILL.md`
- `mise-tasks`
- `mise-expert` when changing `[tools]`, `[env]`, setup behavior, or tool
  versions
- `docs-writer` when editing Markdown

Do not bulk-edit checkboxes. Mark an item complete only after the work is done,
and add an `Evidence:` bullet under that item with the files changed and
commands run for that specific item.

## Phase 0 — Policy and SDD foundation

**Goal:** Establish the canonical policy and implementation plan before changing
task behavior.

- [x] 0.1 Rewrite `assets/guides/MISE_GUIDE.md`.
  - Keep the guide focused on project policy.
  - Distinguish TOML task objects from embedded Usage/KDL specs.
  - Document task shape, similar-task merging, package script rules,
    standalone script rules, destructive-task safety, and verification.
  - _Requirements: MU-1_

- [x] 0.2 Create SDD artifacts under `assets/docs/specs/mise-usage/`.
  - Add `requirements.md`, `design.md`, `tasks.md`, and `handoff.md`.
  - Record the decision to implement locally unless the thread needs a handoff.
  - _Requirements: MU-1, MU-8_

- [x] 0.3 Verify documentation-only changes.
  - Run `git diff --check -- assets/guides/MISE_GUIDE.md assets/docs/specs/mise-usage`.
  - Review links and command examples.
  - _Requirements: MU-1, MU-7_

## Phase 1 — Read-only policy checker

**Goal:** Add a checker that reports current policy findings without modifying
files or becoming blocking.

- [x] 1.1 Add the checker implementation.
  - Parse `mise.toml` with `Bun.TOML.parse`.
  - Parse `package.json` with `JSON.parse`.
  - Extract task metadata and embedded `usage` specs.
  - _Requirements: MU-2, MU-4, MU-6_

- [x] 1.2 Integrate official Usage validation.
  - Prefix each embedded Usage spec with `name "<task>"`.
  - Run `usage lint -W -`.
  - Run `usage generate json -f -`.
  - Report task-scoped failures.
  - _Requirements: MU-2, MU-3_

- [x] 1.3 Add repo-specific policy rules.
  - Report table-style task definitions unless allowlisted.
  - Report split task families unless allowlisted.
  - Report deprecated tasks or scripts as removal candidates.
  - Validate destructive-task metadata.
  - Report complex package scripts that do not delegate to Mise.
  - _Requirements: MU-4, MU-5, MU-6_

- [x] 1.4 Add a canonical Mise entrypoint.
  - Add `mise run policy check` as the canonical policy entrypoint.
  - Support text output first.
  - Add JSON output if it is low-cost.
  - _Requirements: MU-3, MU-8_

- [x] 1.5 Verify phase 1.
  - Run `bun run lint:mise`.
  - Run `mise run policy check`.
  - Run `mise tasks --hidden`.
  - Run focused tests if pure policy modules are added.
  - _Requirements: MU-2, MU-3, MU-8_

## Phase 2 — Encode intentional exceptions

**Goal:** Turn the checker report into a useful signal by recording known,
reviewed exceptions with reasons.

Phase 1 baseline: `mise run policy check` reports 23 advisory findings:
4 table-style task definitions, 4 split task families, and 15 complex package
scripts. Deprecated skill wrappers were removed instead of preserved.

- [x] 2.1 Classify current task families.
  - Evaluate `ci:review:*`, `ci:release:*`, `ci:publish:*`, `repo:*`,
    `test:spec-*`, `skill`, `perf`, and old task aliases.
  - Record which families must merge and which may remain split.
  - _Requirements: MU-4, MU-5_
  - **Evidence:**
    - `ci:review:*`, `ci:release:*`, `ci:publish:*` — intentionally split (distinct CI safety profiles)
    - `repo:*` — intentionally split (`repo:setup` is safe, `repo:prune` is destructive)
    - `test:spec-*` — intentionally split (audit and style are different concerns)
    - `skill`, `perf`, `policy` — already canonical action-driven tasks
    - Deprecated wrappers removed (`skills:validate`, `skills:sync`, `link:skills`)
    - `clean`, `cleanup`, `reinstall`, `lint*`, `test:ci` — delegated to mise

- [x] 2.2 Classify package scripts.
  - Identify simple aliases, package-manager integration scripts, complex
    project automation, and migration candidates.
  - Record which scripts must delegate to Mise.
  - _Requirements: MU-6_
  - **Evidence:**
    - 15 scripts delegated to `mise run`: clean, cleanup, reinstall, test:ci, lint, lint:strict, lint:fix, lint:*:ci (11 total)
    - Simple aliases preserved: start, dev*, build*, test, typecheck, lint:biome*, lint:knip, lint:depcruise, lint:jscpd, lint:ls, lint:ast-grep*, lint:mise, e2e:*, release:ci
    - All complex scripts now start with `mise run` — checker reports zero findings

- [x] 2.3 Classify standalone scripts.
  - Review `.agents/skills/*/scripts/` and `tools/`.
  - Mark scripts as editor-only, skill-internal, tool-internal, or migration
    candidates.
  - _Requirements: MU-6, MU-7_
  - **Evidence:**
    - `[tasks.policy]` in `mise.toml` — inline Bun policy checker (no external script)
    - `tools/benchmarks/`, `tools/preview/`, `tools/rules/` — tool-internal; spec audit/style live in `[tasks.test]`
    - `.agents/skills/*/scripts/gate.sh` — skill-internal (quality gate)
    - No migration candidates identified

- [x] 2.4 Verify phase 2.
  - Run `mise run policy check`.
  - Confirm expected exceptions are documented and unexpected findings remain
    visible.
  - _Requirements: MU-5, MU-6, MU-8_
  - **Evidence:**
    - `mise run policy check --strict` → exit 0, output: `policy check: no findings`
    - `mise run lint:mise` → pass
    - All 23 original findings are now resolved (4 table-style, 4 split-families, 15 complex scripts)
    - Intentionally split families documented above; policy checker reflects empty SPLIT_FAMILY_PREFIXES

## Phase 3 — Refactor task families

**Goal:** Move from report-only policy to canonical public task families.

- [x] 3.1 Refactor project setup tasks.
  - Evaluate `setup` and `prepare`.
  - Prefer a canonical `project` or equivalent task with Usage actions if it
    improves discoverability.
  - Remove old task names unless a released external contract requires them.
  - _Requirements: MU-3, MU-5_

- [x] 3.2 Refactor CI and release tasks.
  - Evaluate `ci:review:*`, `ci:release:*`, and `ci:publish:*`.
  - Merge low-risk action families.
  - Keep split tasks only where CI readability or release safety requires it.
  - _Requirements: MU-3, MU-5, MU-8_

- [x] 3.3 Refactor repo and test tasks.
  - Evaluate `repo:*`, `test:spec-*`, and `e2e:preview` commands.
  - Add destructive-task safeguards where needed.
  - _Requirements: MU-4, MU-5, MU-8_

- [x] 3.4 Verify phase 3.
  - Run `bun run lint:mise`.
  - Run `mise tasks --hidden`.
  - Run changed task help commands.
  - Run safe smoke checks only.
  - Run the full quality gate.
  - _Requirements: MU-8_

## Phase 4 — Update docs and package scripts

**Goal:** Make user-facing and agent-facing references match the canonical task
surface.

- [x] 4.1 Update package scripts.
  - Convert complex package scripts to delegate to Mise or record an exception.
  - Add `mise run policy check` to `bun run lint` only after it is stable.
  - _Requirements: MU-6, MU-8_

- [x] 4.2 Update root and agent docs.
  - Update `README.md`, `AGENTS.md`, `CLAUDE.md`, `.cursor` guidance, and
    relevant guides.
  - Replace stale task names with canonical commands.
  - Keep direct script references only where they are explicitly current
    executable authorities.
  - _Requirements: MU-7_

- [x] 4.3 Update active specs.
  - Search active specs for stale commands.
  - Update command examples only where the docs are active or directly
    referenced.
  - Preserve historical context where changing it would be misleading.
  - _Requirements: MU-7_

- [x] 4.4 Verify phase 4.
  - Run `mise run policy check`.
  - Run `bun run lint`.
  - Run the full quality gate.
  - _Requirements: MU-7, MU-8_

## Phase 5 — Make enforcement blocking

**Goal:** Promote the checker from advisory to enforced.

- [x] 5.1 Add the checker to the quality stack.
  - Add it to the relevant lint chain.
  - Add it to the app quality gate.
  - _Requirements: MU-8_

- [x] 5.2 Final verification.
  - Run `mise run policy check --strict`.
  - Confirm text output is exactly `policy check: no findings`.
  - Confirm `mise run policy check --format=json` reports an empty `findings`
    array.
  - Run `mise tasks validate`.
  - Confirm `NO_COLOR=1 COLUMNS=120 mise tasks` matches the expected public task
    surface recorded in `handoff.md` line by line, with no extra, missing,
    renamed, reordered, or reworded public tasks.
  - Confirm each public task matches the expected command contracts recorded in
    `handoff.md`, including default actions, selected flags, and unsafe-action
    exclusions.
  - Confirm the expected public task surface in `handoff.md` was not edited
    during implementation unless the maintainer explicitly approved a new
    snapshot before the refactor.
  - Verify every changed or merged task through help output and a safe smoke or
    dry-run path.
  - Confirm unsafe release, publish, repository deletion, remote deletion, or
    mutation tasks were not executed without explicit user approval.
  - Run `bun run lint`.
  - Run `bash .agents/skills/app-quality-gate/scripts/gate.sh`.
  - Record any removed task names and their new action or flag syntax.
  - _Requirements: MU-8_

## Implementation owner decision

The recommended owner is the current agent/thread after this SDD package is
reviewed. A handoff exists for contingency only; the policy decisions are
context-heavy enough that local implementation is safer.
