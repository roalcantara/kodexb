<!-- markdownlint-disable-file -->
# Mise usage improvements — Requirements

## Introduction

The current Mise task cleanup needs a stricter implementation contract. The
next pass must make every public task self-documenting, remove task-family
duplication, remove confusing `package.json` CI aliases, and prove that each
remaining command still works through the new Usage syntax.

This spec supersedes the older handoff in `assets/docs/specs/mise-usage/` for
the final task-contract cleanup. The earlier spec remains useful for the policy
checker rationale, but this spec defines the accepted public surface and the
validation evidence required before the refactor can be called complete.

## Sources

- Usage `cmd` reference:
  https://usage.jdx.dev/spec/reference/cmd
- Usage `flag` reference:
  https://usage.jdx.dev/spec/reference/flag
- Usage lint reference:
  https://usage.jdx.dev/cli/reference/lint
- Mise task templates:
  https://mise.jdx.dev/tasks/templates.html

## Out of scope

- Replacing Mise with another task runner.
- Adding deprecated compatibility wrappers for unreleased public task names.
- Running destructive repository, release, or publish mutations during
  validation.
- Rewriting unrelated Electrobun, renderer, database, or RPC behavior.
- Preserving historical command examples where the document is clearly archival
  and not used as current guidance.

## Requirement syntax

- **WHEN** _event_, **THEN** the system **SHALL** _response_.
- **IF** _precondition_, **THEN** the system **SHALL** _response_.

## Requirement MUI-1: Public task surface

### Acceptance criteria

1. WHEN `NO_COLOR=1 COLUMNS=120 mise tasks` is run, THEN the output SHALL match
   the expected public task surface in `handoff.md` exactly.
2. WHEN the public task surface is reviewed, THEN `release`, `publish`, `repo`,
   and `icons` SHALL NOT appear as top-level public tasks.
3. WHEN release or publish behavior is needed, THEN it SHALL be reachable under
   `mise run ci`.
4. WHEN repository or icon behavior is needed, THEN it SHALL be reachable under
   `mise run project`.
5. WHEN a task remains public, THEN its description SHALL explain the behavior
   and not merely restate the task name.

## Requirement MUI-2: Usage contracts

### Acceptance criteria

1. WHEN a task has subcommands, THEN it SHALL use Usage `cmd` nodes and expose
   the selected command through `usage_cmd`.
2. WHEN an operation is independent and safely combinable with another
   operation in the same task, THEN it SHALL be represented as a boolean flag.
3. WHEN an operation has distinct required inputs, mutually exclusive behavior,
   or materially different safety rules, THEN it SHALL be represented as a
   nested Usage `cmd`.
4. WHEN a flag accepts a constrained value, THEN it SHALL declare explicit
   Usage `choices`.
5. WHEN a subcommand requires a flag, THEN the required flag SHALL be scoped to
   that subcommand instead of being accepted by unrelated subcommands.
6. WHEN invalid Usage input is passed, THEN Mise/Usage SHALL reject it before
   the task body performs work.

## Requirement MUI-3: Command behavior preservation

### Acceptance criteria

1. WHEN `mise run ci` is executed, THEN it SHALL run the default review flow
   and SHALL NOT run release, publish, repository, or icon behavior.
2. WHEN `mise run ci review` is executed without flags, THEN it SHALL run the
   full review flow.
3. WHEN `mise run ci review` is executed with one or more phase flags, THEN it
   SHALL run only the selected review phases.
4. WHEN `mise run ci release` is executed with multiple release flags, THEN it
   SHALL run the selected release checks in deterministic order.
5. WHEN `mise run ci publish package` is executed, THEN `--version` SHALL be
   required and `--target` SHALL accept only `linux-x64`, `linux-arm64`, and
   `darwin-arm64`.
6. WHEN `mise run project repo` reaches destructive behavior, THEN it SHALL
   require explicit confirmation or expose only safe metadata validation during
   automated checks.
7. WHEN `mise run project icons` is executed without flags, THEN it SHALL run a
   safe check path.

## Requirement MUI-4: Package scripts

### Acceptance criteria

1. WHEN `package.json` scripts are reviewed, THEN scripts ending in `:ci` SHALL
   be removed unless an external tool requires that exact package-script name.
2. WHEN CI needs a command, THEN CI workflows SHALL call canonical Mise tasks
   directly.
3. WHEN package scripts remain, THEN each script SHALL be either a primitive
   tool alias, an Electrobun lifecycle alias, a developer muscle-memory alias,
   or a direct Mise delegation.
4. WHEN a command contains orchestration logic, THEN that logic SHALL live in
   `mise.toml`, not duplicated between Mise and `package.json`.
5. WHEN `node -e` prints the final package script keys, THEN the output SHALL
   match the expected package script surface in `handoff.md` exactly.

## Requirement MUI-5: CI workflows and docs

### Acceptance criteria

1. WHEN `.github/workflows/review.yml` is updated, THEN it SHALL call canonical
   Mise lint, test, and build commands instead of `bun run *:ci` aliases.
2. WHEN `.github/workflows/release.yml` is updated, THEN it SHALL call
   `mise run ci release` for signing, squash, dry-run, notes, and release
   execution where applicable.
3. WHEN `.github/workflows/publish.yml` is updated, THEN it SHALL call
   `mise run ci publish` commands for build, package, and checksum behavior
   where the current workflow does not rely on a reusable GitHub action.
4. WHEN docs mention current task commands, THEN README, agent docs, Cursor
   guidance, active specs, and guides SHALL reference canonical commands.
5. WHEN active docs are searched for removed public task names, THEN only
   historical or explicitly migrated references SHALL remain.

## Requirement MUI-6: Validation evidence

### Acceptance criteria

1. WHEN an implementation task changes, merges, removes, or renames a command,
   THEN that task's acceptance criteria SHALL include the exact validation
   commands for the affected command contract.
2. WHEN an implementation task is marked complete, THEN the task SHALL include
   evidence that its command-level acceptance criteria passed.
3. WHEN a task affects an unsafe command, THEN its acceptance criteria SHALL
   require metadata, help, syntax, negative parsing, or dry-run validation
   instead of destructive execution.
4. WHEN implementation is complete, THEN `mise run policy check --strict` SHALL
   exit 0 and print exactly `policy check: no findings`.
5. WHEN JSON policy output is requested, THEN
   `mise run policy check --format=json` SHALL report `findings: []`.
6. WHEN task discovery is validated, THEN `NO_COLOR=1 COLUMNS=120 mise tasks`
   SHALL match the expected public task surface line by line.
7. WHEN package scripts are validated, THEN the final script-key command in
   `handoff.md` SHALL match exactly.
8. WHEN each public task is changed, THEN the implementer SHALL run its help
   command and one safe smoke, dry-run, or negative parsing check.
9. IF a task is unsafe to execute, THEN validation SHALL use Usage metadata,
   help output, syntax checks, and negative parsing checks instead of executing
   the mutation.
10. WHEN checappoxes are marked complete, THEN each item SHALL include an
   `Evidence:` bullet with changed files and exact commands.
