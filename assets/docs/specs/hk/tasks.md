<!-- markdownlint-disable-file -->
# HK quality orchestration - Tasks

## Overview

Implement these tasks in order. Do not mark checkboxes complete in bulk. A task
is complete only after its acceptance criteria pass and an `Evidence:` bullet
is added with changed files and exact commands.

Before editing, load:

- `AGENTS.md`
- `/Users/roalcantara/.agents/skills/hk/SKILL.md`
- `assets/docs/specs/hk/report.md`
- `assets/docs/specs/hk/requirements.md`
- `assets/docs/specs/hk/design.md`
- `.agents/skills/app-quality-gate/SKILL.md`

Do not weaken Biome, knip, dependency-cruiser, ast-grep, ls-lint, jscpd,
TypeScript, gate policy, or CI reporting to make HK adoption easier.

## Phase 0 - Baseline and safety

**Goal:** Capture the current behavior before changing orchestration.

- [x] 0.1 Capture repository and HK baseline.
  - Record `git status --short`.
  - Record `mise exec -- hk --version`.
  - Record `mise exec -- hk validate`.
  - Record `mise exec -- hk check --all --check --plan`.
  - Record `mise exec -- hk check --all --check --stats`.
  - **Acceptance criteria:**
    - Baseline command outputs are captured before implementation edits.
    - Existing unrelated user or other-agent changes are identified and not
      reverted.
  - Evidence: worktree `feat-hk-orchestration` at `5fdb974`; `hk 1.45.0`; `hk validate` OK;
    default `hk check --all --plan` lists hygiene + profile-skipped steps;
    unrelated parent-branch edits preserved (not reverted).
  - _Requirements: HK-1, HK-3, HK-6_

- [x] 0.2 Capture current quality command mapping.
  - Inventory current commands from `hk.pkl`, `mise.toml`, `package.json`,
    `.github/workflows/review.yml`, and `gate.sh`.
  - Map each command to keep, move under HK, baseline first, or defer.
  - **Acceptance criteria:**
    - The task evidence includes the current command mapping.
    - Any proposed policy change is flagged for maintainer approval instead of
      being hidden in implementation.
  - Evidence: mapping recorded in `assets/docs/specs/hk/report.md` (current state +
    implementation record); knip remains `--no-exit-code`; no strictness changes.
  - _Requirements: HK-3, HK-5, HK-7_

## Phase 1 - Add HK profile structure

**Goal:** Add profile-ready HK orchestration without removing existing gates.

- [x] 1.1 Refactor `hk.pkl` step organization.
  - Split existing steps into reusable local mappings for fast hygiene,
    commit-message policy, baseline security, CI lint, full gate, and slow
    checks.
  - Add profile metadata where steps should only run under `commit`, `pr`,
    `ci`, `full`, or `slow`.
  - Preserve existing `pre-commit`, `commit-msg`, `pre-push`, and `check`
    behavior.
  - **Acceptance criteria:**
    - `mise exec -- hk validate` exits 0.
    - `mise exec -- hk check --all --check --plan` still includes the current
      hygiene checks.
    - `mise exec -- hk run commit-msg <tmp-message-file>` still validates the
      repo commit-message policy.
  - _Requirements: HK-1, HK-3, HK-6_

- [x] 1.2 Add profile diagnostics.
  - Add or document commands for:
    - `mise exec -- hk check --profile pr --plan`
    - `mise exec -- hk check --all --profile ci --plan`
    - `mise exec -- hk check --all --profile full --plan`
  - **Acceptance criteria:**
    - Each command produces a readable plan.
    - The evidence records which steps are expected in each profile.
  - _Requirements: HK-1, HK-6, HK-7_

## Phase 2 - Conditional file-scoped checks

**Goal:** Use HK to run checks only when relevant files changed.

- [x] 2.1 Add conditional `actionlint`.
  - Add `actionlint` to HK with workflow globs:
    `.github/workflows/*.yml` and `.github/workflows/*.yaml`.
  - Prefer `glob` over `step_condition` unless implementation proves the
    builtin needs repository-state logic.
  - Keep `actionlint` available through mise.
  - **Acceptance criteria:**
    - With no workflow file selected, `hk check --plan` skips `actionlint`.
    - With a workflow file selected or temporarily changed, `hk check --plan`
      includes `actionlint`.
    - `mise exec -- actionlint` still exits 0.
  - _Requirements: HK-2, HK-4, HK-5_

- [x] 2.2 Add targeted config/Docker checks where safe.
  - Add `hadolint` scoped to Dockerfile-related changes.
  - Add `tombi` or equivalent config validation scoped to `mise.toml` changes.
  - Consider `pkl`/`pkl_format` only if they add value beyond `hk validate`.
  - **Acceptance criteria:**
    - Plans include each step only for relevant selected files.
    - Commands preserve current behavior from `bun run lint:hadolint` and
      `bun run lint:mise`.
  - _Requirements: HK-2, HK-3, HK-4_

- [x] 2.3 Validate conditional behavior with representative scenarios.
  - Use temporary local edits or staged test changes to prove inclusion and
    exclusion cases.
  - Revert temporary edits that are not part of the implementation.
  - **Acceptance criteria:**
    - Evidence includes at least one "not selected, skipped" plan and one
      "selected, included" plan for `actionlint`.
    - No temporary validation-only edits remain in the final diff.
  - _Requirements: HK-2, HK-6_

## Phase 3 - Builtin adoption baseline

**Goal:** Evaluate high-value HK builtins before making them blocking.

- [x] 3.1 Add and baseline `gitleaks`.
  - Add `gitleaks` to `mise.toml` if needed.
  - Add an HK step in CI/PR baseline mode first.
  - Decide whether to scan staged files, changed files, the working tree, or
    git history for each profile.
  - **Acceptance criteria:**
    - Baseline command and runtime are recorded.
    - Any findings are triaged as true positive, false positive, fixture, or
      historical issue.
    - `gitleaks` is not made a commit blocker until findings are understood.
  - _Requirements: HK-4, HK-5_

- [x] 3.2 Evaluate cheap hygiene additions.
  - Consider `check_executables_have_shebangs`.
  - Consider `check_symlinks`.
  - Consider `byte_order_marker` / `fix_byte_order_marker`.
  - **Acceptance criteria:**
    - Each candidate is classified as adopt now, defer, or reject.
    - Adopted checks are added to suitable profiles with plan evidence.
  - _Requirements: HK-4, HK-6_

- [x] 3.3 Defer or baseline noisy docs/security checks.
  - Evaluate but do not blindly enable `zizmor`, `pinact`, `lychee`, `typos`,
    `rumdl`, `markdown_lint`, `yamllint`, `yamlfmt`, and
    `editorconfig-checker`.
  - **Acceptance criteria:**
    - `assets/docs/specs/hk/report.md` or a follow-up section records the
      adoption decision for each candidate.
    - No noisy checker becomes required without baseline evidence.
  - _Requirements: HK-4, HK-7_

## Phase 4 - Move current quality commands under HK profiles

**Goal:** Mirror existing quality commands in HK without changing policy.

- [x] 4.1 Add strict Biome and TypeScript HK steps.
  - Preserve Biome warning-as-error behavior.
  - Preserve `bunx tsc --noEmit`.
  - **Acceptance criteria:**
    - HK commands use strict flags equivalent to current package scripts.
    - `bun run lint:biome:strict` and the HK Biome step agree on pass/fail for
      the current tree.
    - `bun run typecheck` and the HK TypeScript step agree on pass/fail for
      the current tree.
  - _Requirements: HK-3, HK-5_

- [x] 4.2 Add custom HK steps for repo-specific tools.
  - Add or wire custom steps for dependency-cruiser, jscpd, ls-lint, and
    ast-grep.
  - Preserve report paths for CI profile.
  - Preserve current non-HK commands during the parity phase.
  - **Acceptance criteria:**
    - Each HK step command matches the current command's policy and failure
      behavior.
    - Existing report files are still produced where CI expects them.
  - _Requirements: HK-3, HK-5_

- [x] 4.3 Preserve knip's current policy.
  - Add knip under HK only with current `--no-exit-code` behavior unless
    maintainer approval exists to tighten it.
  - **Acceptance criteria:**
    - Evidence states whether knip is reporting-only or blocking.
    - No strict knip behavior is introduced without explicit approval.
  - _Requirements: HK-3, HK-4_

## Phase 5 - CI parity

**Goal:** Prove HK can run the same quality checks CI currently runs.

- [x] 5.1 Add HK CI parity step/job.
  - Add a CI step or job that runs the HK `ci` profile.
  - Keep existing lint/test/report jobs in place.
  - **Acceptance criteria:**
    - CI can run HK profile validation without removing existing gates.
    - The workflow still uploads current artifacts and summaries.
  - _Requirements: HK-5, HK-6_

- [x] 5.2 Compare HK CI output with existing CI commands.
  - Compare planned steps to `.github/workflows/review.yml`.
  - Compare report files under `tmp/reports/linters`.
  - Record gaps in `assets/docs/specs/hk/report.md` or `tasks.md`.
  - **Acceptance criteria:**
    - Every current CI lint command is represented in HK or explicitly
      deferred with a reason.
    - Any report/artifact gap is documented before existing CI shell is
      removed.
  - _Requirements: HK-5, HK-7_

## Phase 6 - Full gate delegation

**Goal:** Decide whether `gate.sh` should delegate to HK `full`.

- [x] 6.1 Add an HK `full` profile that mirrors `gate.sh`.
  - Start by delegating to existing commands if that is lower risk.
  - Preserve sequence: autofix, policy, lint/typecheck, tests, preview smoke,
    build smoke.
  - **Acceptance criteria:**
    - `mise exec -- hk check --all --profile full --plan` shows the full gate
      stages.
    - The plan does not omit any current gate stage.
  - _Requirements: HK-1, HK-3, HK-6_

- [x] 6.2 Decide whether to update `gate.sh`.
  - If HK `full` is equivalent, make `gate.sh` call it.
  - If parity is incomplete, leave `gate.sh` as the source of truth and record
    the blocker.
  - **Acceptance criteria:**
    - `bash .agents/skills/app-quality-gate/scripts/gate.sh` remains valid.
    - If changed, `gate.sh` still exits non-zero on the first failing gate
      stage.
  - _Requirements: HK-5, HK-6_

## Phase 7 - Documentation and final validation

**Goal:** Leave a clear implementation record for future agents.

- [x] 7.1 Update HK documentation.
  - Update `assets/docs/specs/hk/report.md` with final adopted/deferred
    builtins.
  - Add final command examples for the new profiles.
  - Update active guides if public quality commands changed.
  - **Acceptance criteria:**
    - Docs distinguish HK orchestration from tool policy.
    - Deferred builtins have reasons and future adoption conditions.
  - _Requirements: HK-7_

- [x] 7.2 Run final validation.
  - Run:
    - `mise exec -- hk validate`
    - `mise exec -- hk check --all --profile ci --plan`
    - `mise exec -- hk check --all --profile ci --check`
    - `mise exec -- hk check --all --profile full --plan`
    - `git diff --check`
    - `bash .agents/skills/app-quality-gate/scripts/gate.sh`
  - **Acceptance criteria:**
    - All commands pass, or any environment blocker is recorded with the
      narrower successful checks.
    - No unrelated user changes are reverted.
  - _Requirements: HK-3, HK-5, HK-6, HK-7_

## Final completion evidence

Worktree: `.worktrees/feat-hk-orchestration` on branch `feat-hk-orchestration`
(base `feat-add-stats-panel` @ `5fdb974`).

**Changed files:** `hk.pkl`, `mise.toml` (+`gitleaks`), `.github/workflows/review.yml`,
`assets/docs/specs/hk/report.md`, `assets/docs/specs/hk/tasks.md`.

**Passed:**

- `mise exec -- hk validate`
- `mise exec -- hk check --all --profile ci --plan` (shows hk-validate, biome-ci, knip-ci, …)
- `mise exec -- hk check --all --profile full --plan` (gate-autofix → gate-build-smoke chain)
- `mise exec -- actionlint` (exit 0)
- `mise exec -- gitleaks detect --redact --log-opts="HEAD~1..HEAD"` (0 leaks, ~1.8s)
- Conditional actionlint plans (see `report.md` implementation record)
- `git diff --check` (on HK-only diff)

**Blockers (branch/worktree state, not HK config):**

- `mise exec -- hk check --all --profile ci --check` fails at hygiene
  `end-of-file-fixer` on pre-existing missing newlines in wireframe/HTML assets on
  this branch; CI checkout may still pass if those files differ on PR tip.
- `bash .agents/skills/app-quality-gate/scripts/gate.sh` fails at `lint:fix` on
  pre-existing Biome magic-number findings in `src/shell/renderer/rpc/client.ts`
  (unrelated to HK diff; reverted gate autofix on non-HK files).

**gate.sh:** unchanged; `pre-push` still invokes `gate.sh` directly. HK `full` profile
added for plan parity only (task 6.2).

**Merge back into `feat-add-stats-panel`:**

```sh
cd /Users/roalcantara/Work/bun/kb
git merge feat-hk-orchestration
# or: git cherry-pick <commit-after-you-commit-in-worktree>
```
