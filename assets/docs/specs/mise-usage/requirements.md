<!-- markdownlint-disable-file -->
# Mise usage policy — Requirements

## Introduction

The project needs executable enforcement for its Mise task policy. The current
automation surface mixes several patterns: separate task names for similar
actions, embedded `usage` specs without a dedicated lint pass, complex
`package.json` scripts, documented direct script entrypoints, and a mix of
inline and table-style task definitions.

This spec defines a small policy system for Mise and Usage. The policy keeps
`mise.toml` as the runtime source of truth, uses the official Usage CLI to
validate embedded `usage` specs, and adds a repo-specific checker for kb's task
shape rules. It also records the documentation updates needed when canonical
commands change.

## Out of scope

- Replacing Mise with a custom task runner.
- Writing a general-purpose KDL parser.
- Removing simple package scripts that are still useful to Bun, third-party
  tooling, or developer muscle memory.
- Executing destructive, release-facing, or network-facing tasks as part of the
  policy checker.
- Changing Electrobun, Elysia, database, or renderer behavior.

## Requirement syntax

- **WHEN** _event_, **THEN** the system **SHALL** _response_.
- **IF** _precondition_, **THEN** the system **SHALL** _response_.

## Requirement MU-1: Mise guide policy

### Acceptance criteria

1. WHEN `assets/guides/MISE_GUIDE.md` is read, THEN it SHALL describe the
   project policy for Mise task authoring, not a generic Mise tutorial.
2. WHEN the guide describes task definitions, THEN it SHALL distinguish TOML
   task objects from embedded Usage/KDL specs.
3. WHEN the guide describes parameterized tasks, THEN it SHALL require `usage`
   args or flags for user-facing inputs.
4. WHEN the guide describes similar task families, THEN it SHALL prefer one
   public task with an action arg unless separation protects safety or clarity.
5. WHEN the guide describes standalone scripts, THEN it SHALL require canonical
   project automation to be discoverable through Mise.

## Requirement MU-2: Usage linting

### Acceptance criteria

1. WHEN `mise.toml` contains a task with a `usage` field, THEN the policy
   checker SHALL extract that field.
2. WHEN the checker lints an embedded `usage` field, THEN it SHALL prefix the
   extracted spec with a synthetic `name "<task>"` line before invoking Usage.
3. WHEN the checker invokes Usage linting, THEN it SHALL run
   `usage lint -W -` against each extracted spec.
4. IF Usage reports an error or warning, THEN the checker SHALL fail and report
   the task name and Usage output.

## Requirement MU-3: Usage contract inspection

### Acceptance criteria

1. WHEN a task belongs to a configured action-driven family, THEN the checker
   SHALL verify that the generated Usage JSON contains an action argument.
2. WHEN an action argument is required by policy, THEN the checker SHALL verify
   that the argument has explicit `choices`.
3. WHEN a policy requires phase flags, THEN the checker SHALL verify that the
   generated Usage JSON exposes the expected flags.
4. WHEN the checker inspects Usage structure, THEN it SHALL use
   `usage generate json -f -` rather than a custom KDL parser.

## Requirement MU-4: Task shape policy

### Acceptance criteria

1. WHEN a public task is defined in `mise.toml`, THEN it SHALL be an inline task
   object under the root `[tasks]` table unless it is listed as a temporary
   exception.
2. WHEN a table-style task definition remains, THEN the checker SHALL report it
   unless it is allowlisted with a reason.
3. WHEN a task or script is marked deprecated, THEN the checker SHALL report it
   as a removal candidate unless a released external contract requires it.
4. WHEN a destructive task exists, THEN the checker SHALL require either a
   `confirm` prompt or an explicit allowlisted reason.

## Requirement MU-5: Similar task families

### Acceptance criteria

1. WHEN public tasks share a namespace and differ only by action, THEN the
   checker SHALL report the family as a consolidation candidate unless it is
   allowlisted.
2. WHEN a family is configured as canonical action-driven, THEN the checker
   SHALL require one public task with a Usage action argument.
3. IF a family remains split for CI readability, release safety, destructive
   behavior, or third-party integration, THEN the exception SHALL include the
   reason and verification path.

## Requirement MU-6: Package scripts and standalone automation

### Acceptance criteria

1. WHEN `package.json` contains a script with orchestration operators, THEN the
   checker SHALL report it as complex unless it delegates to Mise or is
   allowlisted.
2. WHEN project automation exists under `.agents/skills/*/scripts/` or
   `tools/`, THEN documentation SHALL point to a canonical Mise task unless the
   file is an implementation detail.
3. WHEN a standalone script is intentionally kept, THEN the policy SHALL record
   whether it is editor-only, skill-internal, or tool-internal.

## Requirement MU-7: Documentation updates

### Acceptance criteria

1. WHEN canonical task names change, THEN `README.md`, `AGENTS.md`,
   `CLAUDE.md`, `.cursor` guidance, `assets/guides/`, and active specs SHALL
   be searched for stale command references.
2. WHEN docs mention direct gate scripts, THEN they SHALL either point to the
   canonical Mise task or explicitly identify the script as the current
   executable authority.
3. WHEN package scripts delegate to Mise, THEN user-facing docs SHALL prefer the
   canonical Mise command unless a package script is the expected integration
   entrypoint.

## Requirement MU-8: Verification and rollout

### Acceptance criteria

1. WHEN the read-only checker is added, THEN it SHALL run without modifying
   files.
2. WHEN the checker reports expected current violations, THEN the task plan
   SHALL record the findings before making the checker blocking.
3. WHEN policy exceptions are encoded, THEN the checker SHALL become eligible
   for `bun run lint` and the kb quality gate.
4. WHEN executable task behavior changes, THEN `bun run lint:mise`,
   `mise tasks --hidden`, relevant `mise run <task> --help` commands, and the
   full quality gate SHALL pass or a blocker SHALL be recorded.
