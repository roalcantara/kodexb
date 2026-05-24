<!-- markdownlint-disable-file -->
# Update hooks — Requirements

## Introduction

The project currently uses `pre-commit` only as the Git hook installer and
`gitlint` as the commit-message policy engine. This creates a Python-backed
tooling path for a Bun and Mise project, duplicates commit-message rules across
multiple docs, and leaves broader Git lifecycle checks outside one coherent
hook system.

This spec replaces `pre-commit` and `gitlint` with [hk](https://hk.jdx.dev/),
while preserving the current commit-message contract exactly where that
contract is intentional. The migration must also adopt the useful HK ecosystem
features that fit this repo: `hk.pkl`, mise-managed tool provisioning,
`HK_PKL_BACKEND=pklr`, `hk install --mise`, HK native utilities, fast
staged-file checks, explicit `commit-msg` validation, and CI-visible hook
validation.

## Current State

The current hook stack is:

- `.pre-commit-config.yaml` installs a `gitlint` hook at `commit-msg`.
- `.gitlint` defines the real commit-message policy.
- `mise.toml` installs `pre-commit = "4.4"` and `project prepare` runs
  `pre-commit install --hook-type commit-msg` outside CI.
- Cursor commit commands run the quality gate before committing and then run
  `pre-commit run gitlint --hook-stage commit-msg --commit-msg-filename`.
- `AGENTS.md`, `README.md`, `assets/guides/DoD.md`,
  `assets/guides/GIT_GUIDE.md`, `assets/guides/GIT_COMMITS_GUIDE.md`,
  `.cursor/rules/gitlint-commit-messages.mdc`, and
  `.agents/skills/kb-quality-gate/SKILL.md` reference the old stack.

The current `pre-commit` config does not define general `pre-commit` file
checks. In practice, this repo currently uses `pre-commit` as a wrapper around
`gitlint`, not as the main linting quality gate.

## Sources

- HK getting started:
  https://hk.jdx.dev/getting_started
- HK configuration:
  https://hk.jdx.dev/configuration.html
- HK hooks:
  https://hk.jdx.dev/hooks.html
- HK builtins:
  https://hk.jdx.dev/builtins.html
- HK mise integration:
  https://hk.jdx.dev/mise_integration.html
- HK Pkl introduction:
  https://hk.jdx.dev/pkl_introduction.html
- HK CLI `check`:
  https://hk.jdx.dev/cli/check.html
- HK CLI `run commit-msg`:
  https://hk.jdx.dev/cli/run/commit-msg.html
- HK CLI `validate`:
  https://hk.jdx.dev/cli/validate.html
- HK utility `check-conventional-commit`:
  https://hk.jdx.dev/cli/util/check-conventional-commit.html

## Out of Scope

- Replacing the kb quality gate with HK.
- Changing Conventional Commit policy beyond the explicit release-it fix in
  this spec.
- Adding deprecated wrappers for `pre-commit` or `gitlint`.
- Adding a new top-level public Mise task solely for hooks.
- Installing global hooks for the user. The repo may document the option, but
  implementation must use repo-local `hk install --mise`.
- Running destructive release, publish, repository reset, or repository prune
  behavior during validation.

## Requirement syntax

- **WHEN** _event_, **THEN** the system **SHALL** _response_.
- **IF** _precondition_, **THEN** the system **SHALL** _response_.

## Requirement UH-1: Tool replacement

### Acceptance criteria

1. WHEN the migration is complete, THEN `pre-commit` SHALL NOT be installed
   through `mise.toml`.
2. WHEN the migration is complete, THEN `.pre-commit-config.yaml` SHALL be
   deleted.
3. WHEN the migration is complete, THEN `.gitlint` SHALL be deleted.
4. WHEN the migration is complete, THEN `mise.toml` SHALL install
   `hk = "1.45.0"` and SHALL NOT install the standalone `pkl` CLI.
5. WHEN the migration is complete, THEN `mise.toml` SHALL set
   `HK_PKL_BACKEND = "pklr"` so HK uses its built-in Pkl evaluator.
6. WHEN local project preparation runs outside CI, THEN it SHALL install HK
   hooks through `hk install --mise`.
7. WHEN local project preparation runs in CI mode, THEN it SHALL NOT install Git
   hooks.
8. WHEN active repo files are searched for `pre-commit`, `gitlint`, `.gitlint`,
   or `.pre-commit-config`, THEN only this spec directory and historical
   changelog/archive files MAY match.

## Requirement UH-2: HK configuration

### Acceptance criteria

1. WHEN the migration is complete, THEN the repository root SHALL contain
   `hk.pkl`.
2. WHEN `mise exec -- hk validate` is run, THEN it SHALL exit 0.
3. WHEN `mise exec -- hk check --all --check` is run, THEN it SHALL exit 0.
4. WHEN `mise exec -- hk check --all --check --plan --json` is run, THEN the
   JSON plan SHALL include these pre-commit hygiene steps:
   `trailing-whitespace`, `end-of-file-fixer`, `mixed-line-ending`,
   `check-merge-conflict`, `detect-private-key`, `check-case-conflict`,
   `check-added-large-files`, and `no-commit-to-branch`.
5. WHEN `hk.pkl` defines `commit-msg`, THEN it SHALL call the repo-local commit
   message policy script and SHALL pass HK's `{{commit_msg_file}}` value to it.
6. WHEN `hk.pkl` defines `pre-push`, THEN it SHALL run
   `bash .agents/skills/kb-quality-gate/scripts/gate.sh` as an exclusive step.
7. WHEN HK steps call project tools, THEN they SHALL use tools provided by Mise
   instead of assuming globally installed dependencies.

## Requirement UH-3: Commit-message policy preservation

### Acceptance criteria

1. WHEN a normal commit message is validated, THEN it SHALL use this subject
   format:
   `^(feat|fix|docs|style|ref|test|revert|chore|ci|build)(\([^)]*\))?(!)?: [A-Z].*`
2. WHEN a normal commit subject is validated, THEN it SHALL be at least 5
   characters and at most 50 characters.
3. WHEN a normal commit subject is validated, THEN it SHALL NOT contain `wip`
   as a word, case-insensitively.
4. WHEN a normal commit subject is validated, THEN it SHALL NOT end with a
   period.
5. WHEN a normal commit body is validated, THEN it SHALL be present and SHALL
   contain at least 20 non-whitespace characters.
6. WHEN a normal commit body is validated, THEN every body line SHALL be at
   most 72 characters.
7. WHEN a commit subject starts with `Merge `, `Revert `, `fixup! `, or
   `squash! `, THEN the validator SHALL skip policy checks and exit 0.
8. WHEN the author name contains `dependabot`, case-insensitively, THEN the
   validator SHALL skip policy checks and exit 0.
9. WHEN the subject starts with `Release `, THEN only the 50-character title
   length rule SHALL be relaxed; all other subject and body rules SHALL still
   apply.
10. WHEN HK's built-in `check-conventional-commit` is evaluated, THEN it SHALL
    NOT be used as the sole policy validator because it does not encode this
    repo's body, subject-length, `ref` type, capital-description, and
    Dependabot rules.

## Requirement UH-4: Commit-message policy implementation

### Acceptance criteria

1. WHEN the policy implementation is added, THEN it SHALL live at
   `tools/hooks/commit_message.script.ts`.
2. WHEN the policy test suite is added, THEN it SHALL live at
   `tools/hooks/commit_message.script.spec.ts`.
3. WHEN the script receives a valid message path, THEN it SHALL read and
   validate that file.
4. WHEN the script receives no message path, THEN it SHALL exit non-zero and
   print `commit message policy: missing message file`.
5. WHEN validation passes, THEN stdout SHALL be exactly
   `commit message policy: ok`.
6. WHEN validation fails, THEN stdout SHALL begin with exactly
   `commit message policy: failed` followed by one `- <reason>` line per
   failure.
7. WHEN validation skips a generated Git subject, THEN stdout SHALL be exactly
   `commit message policy: skipped generated git subject`.
8. WHEN validation skips a Dependabot author, THEN stdout SHALL be exactly
   `commit message policy: skipped dependabot author`.
9. WHEN `bun test tools/hooks/commit_message.script.spec.ts` is run, THEN it
   SHALL exit 0.

## Requirement UH-5: Project setup and documentation

### Acceptance criteria

1. WHEN `mise run project prepare` runs outside CI, THEN it SHALL run
   `hk install --mise` after dependency installation.
2. WHEN `mise run project setup` runs, THEN it SHALL install Mise tools,
   dependencies, and HK hooks through the existing `project prepare` path.
3. WHEN `README.md` lists project tools, THEN it SHALL list HK instead of
   pre-commit and gitlint.
4. WHEN `AGENTS.md` describes commit commands, THEN it SHALL reference HK
   commit-message validation instead of pre-commit gitlint.
5. WHEN `.cursor/commands/commit-all.md`,
   `.cursor/commands/commit-staged.md`, and
   `.cursor/commands/commit-fixup.md` describe post-commit message checks, THEN
   they SHALL use `hk run commit-msg <file>`.
6. WHEN Cursor commit-message guidance is updated, THEN
   `.cursor/rules/gitlint-commit-messages.mdc` SHALL be replaced with
   `.cursor/rules/hk-commit-messages.mdc`.
7. WHEN `assets/guides/GIT_COMMITS_GUIDE.md` describes validation, THEN it
   SHALL name HK as the executable validator and the Bun policy script as the
   canonical implementation.
8. WHEN `assets/guides/DoD.md`,
   `assets/guides/GIT_GUIDE.md`, and
   `.agents/skills/kb-quality-gate/SKILL.md` mention commit hooks, THEN they
   SHALL refer to HK.

## Requirement UH-6: Release commit compatibility

### Acceptance criteria

1. WHEN `package.json` release-it config is reviewed, THEN
   `release-it.git.commitMessage` SHALL be updated so release commits satisfy
   the HK commit-message policy.
2. WHEN the rendered release-it commit message for version `0.0.0-test` is
   validated by the policy script, THEN it SHALL exit 0.
3. WHEN release-it commit hooks are documented, THEN docs SHALL explain that
   release commits still need a Conventional Commit subject and a body.

## Requirement UH-7: CI integration

### Acceptance criteria

1. WHEN `.github/workflows/review.yml` is updated, THEN it SHALL run
   `mise exec -- hk validate`.
2. WHEN `.github/workflows/review.yml` is updated, THEN it SHALL run
   `mise exec -- hk check --all --check`.
3. WHEN `.github/workflows/review.yml` is updated, THEN it SHALL validate the
   HEAD commit message through `mise exec -- hk run commit-msg "$tmpfile"`.
4. WHEN CI validates hooks, THEN it SHALL NOT require `hk install`.
5. WHEN `mise exec -- actionlint` is run, THEN it SHALL exit 0.

## Requirement UH-8: Final validation evidence

### Acceptance criteria

1. WHEN implementation is complete, THEN every command in `handoff.md` under
   "Required validation commands" SHALL have been run.
2. WHEN an implementation task in `tasks.md` is marked complete, THEN it SHALL
   include an `Evidence:` bullet with changed files and exact commands.
3. WHEN the implementation is complete, THEN no checklist item in `tasks.md`
   SHALL be checked without evidence.
4. WHEN `bash .agents/skills/kb-quality-gate/scripts/gate.sh` is run, THEN it
   SHALL exit 0.
5. WHEN `git diff --check` is run, THEN it SHALL exit 0.
