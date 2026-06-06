<!-- markdownlint-disable-file -->
# HK quality orchestration - Requirements

## Introduction

The repository already uses HK for lightweight git-hook hygiene and commit
message validation, but the substantive quality gate still lives across
`hk.pkl`, `mise.toml`, `package.json`, `.github/workflows/review.yml`, and
`.agents/skills/app-quality-gate/scripts/gate.sh`.

This effort promotes HK from a narrow hook runner into the shared
orchestration layer for local, PR, CI, and full-gate quality checks while
preserving the existing quality policy. HK should decide when and how checks
run. Existing tool configs should continue to define what each tool enforces.

The first implementation pass must be conservative. It should add HK profiles,
conditional execution, and a few high-value builtins without weakening the
current gate or removing existing CI/reporting paths before parity is proven.

## Sources

- Research report: `assets/docs/archive/hk/report.md`
- HK configuration docs: https://hk.jdx.dev/configuration.html
- HK builtins docs: https://hk.jdx.dev/builtins.html
- HK hooks docs: https://hk.jdx.dev/hooks.html
- HK check docs: https://hk.jdx.dev/cli/check.html
- Local HK skill: `/Users/roalcantara/.agents/skills/hk/SKILL.md`
- Current config: `hk.pkl`, `mise.toml`, `package.json`,
  `.github/workflows/review.yml`,
  `.agents/skills/app-quality-gate/scripts/gate.sh`

## Out of scope

- Replacing Biome, knip, dependency-cruiser, jscpd, ls-lint, ast-grep,
  TypeScript, Bun test, preview smoke, build smoke, or container structure
  tests.
- Weakening any existing quality tool, threshold, strictness flag, or policy
  check.
- Making `knip` strict unless a maintainer explicitly approves that policy
  change.
- Removing existing CI lint/test/reporting jobs before HK profile parity has
  been proven.
- Moving tool policy into `hk.pkl`; tool configs remain authoritative.
- Creating `docs/superpowers/`.

## Requirement syntax

- **WHEN** _event_, **THEN** the system **SHALL** _response_.
- **IF** _precondition_, **THEN** the system **SHALL** _response_.

## Requirement HK-1: Profile-based quality orchestration

### Acceptance criteria

1. WHEN `hk.pkl` is updated, THEN it SHALL define named profile-oriented step
   groupings for at least `commit`, `pr`, `ci`, `full`, and `slow` behavior.
2. WHEN a developer runs the local commit hook, THEN HK SHALL continue to run
   the existing fast hygiene and commit-safety checks.
3. WHEN a developer runs a PR-oriented HK command, THEN HK SHALL run checks
   relevant to changed files rather than blindly running every expensive
   whole-repo check.
4. WHEN CI invokes the HK CI profile, THEN HK SHALL run CI-oriented checks
   without relying on unstated local developer behavior.
5. WHEN the full gate is invoked, THEN the system SHALL preserve the current
   quality-gate contract: autofix, policy, lint/typecheck, tests, preview
   smoke, and supported-host build smoke.

## Requirement HK-2: Conditional execution by changed files

### Acceptance criteria

1. WHEN a step has a reliable file scope, THEN the step SHALL use HK `glob`,
   `types`, `condition`, or `step_condition` to avoid unnecessary execution.
2. WHEN no workflow files are in the selected HK file set, THEN `actionlint`
   SHALL be skipped.
3. WHEN any `.github/workflows/*.yml` or `.github/workflows/*.yaml` file is in
   the selected HK file set, THEN `actionlint` SHALL run.
4. WHEN a step must evaluate repository state rather than file arguments, THEN
   the implementation SHALL prefer HK's git-status condition data over ad hoc
   shelling where practical.
5. WHEN `hk check --plan` is run for representative changed-file scenarios,
   THEN the plan SHALL show expected included and skipped steps.

## Requirement HK-3: Preserve current quality policy

### Acceptance criteria

1. WHEN Biome is moved under HK orchestration, THEN its strict behavior SHALL
   remain equivalent to `bunx biome check --diagnostic-level=warn
   --error-on-warnings`.
2. WHEN TypeScript is moved under HK orchestration, THEN it SHALL remain
   equivalent to `bunx tsc --noEmit`.
3. WHEN knip is moved under HK orchestration, THEN it SHALL preserve the
   current non-failing `--no-exit-code` behavior unless a maintainer approves a
   stricter policy.
4. WHEN dependency-cruiser, jscpd, ls-lint, or ast-grep run under HK, THEN
   they SHALL preserve their existing config files, command flags, and failure
   behavior.
5. WHEN gate policy checks run, THEN they SHALL continue to reject unapproved
   suppressions and warn on guard-config changes as they do today.
6. WHEN a builtin default differs from current repo policy, THEN the
   implementation SHALL override or replace that builtin with a custom step
   rather than weakening enforcement.

## Requirement HK-4: Builtin adoption and security hardening

### Acceptance criteria

1. WHEN the migration evaluates HK builtins, THEN it SHALL classify each
   relevant builtin as already covered, adopt now, baseline first, defer, or
   not relevant.
2. WHEN `gitleaks` is introduced, THEN it SHALL first run in a baseline-safe
   mode, with false positives and runtime recorded before becoming a commit
   blocker.
3. WHEN `detect_private_key` remains enabled, THEN the docs SHALL clarify that
   it is narrower than `gitleaks` and does not replace full secret scanning.
4. WHEN new security-oriented builtins are proposed, THEN `actionlint`,
   `zizmor`, `pinact`, `check_executables_have_shebangs`, and
   `check_symlinks` SHALL be considered separately with adoption rationale.
5. WHEN a builtin requires an external binary, THEN the binary SHALL be added
   to `mise.toml` or intentionally left as a documented deferred item.

## Requirement HK-5: CI parity and reporting

### Acceptance criteria

1. WHEN HK CI profile work starts, THEN the existing CI lint/test/reporting
   jobs SHALL remain in place until parity is proven.
2. WHEN HK runs CI-oriented lint steps, THEN it SHALL preserve existing report
   paths under `tmp/reports/linters` where those paths are consumed by
   workflow artifacts or summaries.
3. WHEN the HK CI profile fails, THEN the output SHALL identify the failing
   step clearly enough for another agent to reproduce the failure locally.
4. WHEN parity is evaluated, THEN the implementer SHALL compare HK profile
   output against the current CI workflow commands and record gaps.
5. WHEN CI reporting or artifact behavior requires GitHub Actions, THEN that
   behavior SHALL remain in workflow YAML rather than being hidden inside HK.

## Requirement HK-6: Stable public entry points

### Acceptance criteria

1. WHEN existing docs, skills, or Cursor commands call
   `bash .agents/skills/app-quality-gate/scripts/gate.sh`, THEN that path
   SHALL remain valid.
2. WHEN `gate.sh` is changed, THEN it SHALL either keep its current internal
   sequence or delegate to an equivalent HK `full` profile.
3. WHEN package or mise aliases are changed, THEN current developer muscle
   memory commands such as `bun run lint`, `bun run lint:fix`, `bun run
   typecheck`, and `mise run ci review` SHALL remain valid or receive explicit
   doc updates.
4. WHEN `hk validate` is run, THEN `hk.pkl` SHALL validate successfully.
5. WHEN `hk check --plan` is run for the new profiles, THEN the output SHALL
   be usable as implementation evidence.

## Requirement HK-7: Documentation and handoff

### Acceptance criteria

1. WHEN implementation changes HK orchestration, THEN `assets/docs/archive/hk/`
   SHALL document the final profile model, command mapping, and deferred
   builtins.
2. WHEN docs mention current quality commands, THEN they SHALL distinguish
   between HK as orchestration and tool configs as policy.
3. WHEN implementation tasks are marked complete, THEN each task SHALL include
   an `Evidence:` bullet with changed files and exact commands run.
4. WHEN a task is not implemented because it is intentionally deferred, THEN
   the task SHALL record the reason and the condition for future adoption.
5. WHEN the work is handed to another agent, THEN `handoff.md` SHALL provide a
   complete prompt with required context, files, commands, constraints, and
   expected validation evidence.
