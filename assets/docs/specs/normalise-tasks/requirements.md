<!-- markdownlint-disable-file -->
# Normalise mise tasks — Requirements

## Introduction

The project uses Mise as the primary runner for complex workflows, but
`mise.toml`, `package.json`, and project documentation still mix several task
styles: separate task names for similar actions, environment-variable driven
parameters, direct package scripts for complex workflows, and old compatibility
wrappers.

This spec defines a plan to update
[`assets/guides/MISE_GUIDE.md`](../../../guides/MISE_GUIDE.md), then normalise
the root `mise.toml` and related documentation around a single policy:
parameterized workflows use mise `usage` args and flags, similar tasks collapse
into one action-driven task when that improves clarity, and complex project
automation belongs in `mise.toml`.

## Out of scope

- Removing simple `package.json` scripts that are direct tool aliases and still
  useful to Bun or third-party tooling.
- Changing runtime behavior for CI, release, publish, or quality checks without
  a compatibility path.
- Moving Cursor-only hooks out of `.cursor/`.
- Adding external scripts to replace inline mise task scripts.
- Changing tool versions unless required by the task migration.

## Requirement syntax

- **WHEN** _event_, **THEN** the system **SHALL** _response_.
- **IF** _precondition_, **THEN** the system **SHALL** _response_.

## Requirement NT-1: Mise guide policy

### Acceptance criteria

1. WHEN `assets/guides/MISE_GUIDE.md` is updated, THEN it SHALL state that
   complex project workflows belong in root `mise.toml`.
2. WHEN the guide describes parameterized tasks, THEN it SHALL prefer mise
   `usage` args and flags over ad hoc environment variables.
3. WHEN the guide describes similar tasks, THEN it SHALL prefer one task with an
   action arg over several near-duplicate task names when the actions share the
   same domain and implementation surface.
4. WHEN the guide describes complex inline task bodies, THEN it SHALL require a
   shell shebang such as `#!/usr/bin/env bash` or `#!/usr/bin/env bun`.
5. WHEN the guide describes task authoring, THEN it SHALL require loading
   `mise-tasks` for task creation or updates and `mise-expert` for tool-version
   or environment setup changes.

## Requirement NT-2: Task inventory and classification

### Acceptance criteria

1. WHEN the task normalisation starts, THEN the implementer SHALL inventory all
   root `mise.toml` tasks and all `package.json` scripts.
2. WHEN a task is inventoried, THEN the implementer SHALL classify it as simple
   alias, parameterized workflow, task family member, complex script, CI mirror,
   destructive/admin command, or deprecated compatibility wrapper.
3. WHEN a package script is inventoried, THEN the implementer SHALL classify it
   as simple tool alias, package-manager integration, or complex project
   automation candidate.
4. IF a task or script is intentionally kept outside the new policy, THEN the
   implementer SHALL record the exception and reason in `tasks.md`.

## Requirement NT-3: Usage args and flags

### Acceptance criteria

1. WHEN a task accepts variable user input, THEN it SHALL define a mise `usage`
   spec with `arg` or `flag` entries.
2. WHEN a task currently uses a user-facing environment variable for task
   behavior, THEN it SHALL migrate to `usage` args or flags unless the variable
   is a conventional process environment value consumed by the underlying tool.
3. WHEN a flag has a small allowed value set, THEN the `usage` spec SHALL define
   choices.
4. WHEN a task reads usage values in its script body, THEN it SHALL read mise's
   generated `usage_*` variables.

## Requirement NT-4: Similar task consolidation

### Acceptance criteria

1. WHEN two or more tasks share one workflow domain and differ only by action,
   THEN the implementer SHALL evaluate merging them into one action-driven task.
2. IF tasks are merged, THEN the merged task SHALL expose an explicit action arg
   with documented choices.
3. IF a legacy task name is kept, THEN it SHALL be hidden, marked deprecated,
   and delegate to the canonical task.
4. IF merging makes the workflow harder to discover or less safe, THEN the
   implementer SHALL keep separate tasks and record the reason.

## Requirement NT-5: Complex task bodies

### Acceptance criteria

1. WHEN a mise task contains branching, loops, temporary files, cleanup, or
   multi-step control flow, THEN it SHALL use a shell shebang.
2. WHEN the task body is shell-oriented, THEN it SHALL use
   `#!/usr/bin/env bash` and strict mode when safe for the script.
3. WHEN the task body benefits from TypeScript/JavaScript data handling, THEN it
   SHALL use `#!/usr/bin/env bun`.
4. WHEN complex automation exists only as a package script, THEN the
   implementer SHALL evaluate moving the complex body into `mise.toml` and
   leaving a package wrapper only when compatibility requires it.

## Requirement NT-6: Related documentation and references

### Acceptance criteria

1. WHEN a canonical task command changes, THEN the implementer SHALL update
   related references in `README.md`, `AGENTS.md`, `CLAUDE.md`, `package.json`,
   `assets/guides/`, and `assets/docs/specs/`.
2. WHEN compatibility wrappers remain, THEN docs SHALL point to the canonical
   command and mention wrappers only when useful.
3. WHEN package scripts delegate to mise, THEN their names and purpose SHALL be
   documented only where project users need them.
4. WHEN destructive/admin tasks are documented, THEN the docs SHALL preserve
   explicit caution language.

## Requirement NT-7: Verification and safety

### Acceptance criteria

1. WHEN `mise.toml` changes, THEN `bun run lint:mise` SHALL pass.
2. WHEN task names or arguments change, THEN `mise tasks` and task help output
   SHALL show the expected canonical task names and usage.
3. WHEN a task is migrated, THEN the implementer SHALL run the lowest-risk
   smoke command that proves argument parsing and dispatch.
4. IF a task is destructive, release-facing, network-facing, or environment
   dependent, THEN the implementer SHALL validate its help/listing and dry-run
   mode when available instead of executing the dangerous action.
5. WHEN each phase completes, THEN the full quality gate SHALL pass or the exact
   blocker SHALL be recorded.

