<!-- markdownlint-disable-file -->
# Normalise mise tasks — Design

## Overview

This plan updates the project's mise policy and task surface so automation is
more discoverable and less duplicated. The work starts with
`assets/guides/MISE_GUIDE.md`, then migrates `mise.toml`, `package.json`, and
documentation references in small phases.

The target shape is:

- one canonical root `mise.toml` for complex project workflows,
- `usage` args and flags for task inputs,
- action-driven tasks for similar workflow families,
- shell shebangs for complex inline scripts,
- hidden compatibility wrappers only when they reduce migration pain,
- clear docs that point users and agents to canonical commands.

## Architecture

The normalisation has four layers:

1. **Policy layer:** `MISE_GUIDE.md` defines when to use mise, how to design
   arguments, how to consolidate similar tasks, and when to use shebang task
   bodies.
2. **Task layer:** root `mise.toml` implements the policy. It owns complex
   workflows and exposes canonical task names.
3. **Package script layer:** `package.json` keeps simple Bun/package-tool
   aliases and compatibility wrappers. Complex project workflows move to mise.
4. **Reference layer:** README, agent files, guides, and specs reference the
   canonical commands.

The task layer is the source of truth for executable project workflows. The
package script layer is allowed to delegate to mise when external tooling or
developer muscle memory benefits from an npm/Bun script name.

## Task design rules

### Use `usage` for input

Parameterized tasks must define `usage` specs. Action selection uses an
argument:

```toml
usage = '''
arg "<action>" help="Workflow action" {
    choices "run" "baseline" "compare"
}
flag "--strict" help="Exit non-zero when checks fail"
'''
```

Task bodies read mise-generated variables such as `usage_action` and
`usage_strict`. User-facing task parameters must not rely on custom environment
variables when a `usage` arg or flag can express the input.

### Merge similar tasks by domain

Near-duplicate task families become one canonical task when they share the same
domain and dispatcher:

- `skill validate`, `skill sync`, `skill install`, `skill report`
- `perf run`, `perf baseline`, `perf compare`, `perf open`
- potential future `ci release --action dry-run|notes`
- potential future `repo setup|prune`

Separate tasks remain valid when they represent different safety profiles,
different dependencies, or clearer CI mirrors.

### Use shebangs for complex bodies

Complex inline scripts use a shebang:

- `#!/usr/bin/env bash` for shell workflows, filesystem operations, and command
  orchestration.
- `#!/usr/bin/env bun` for JSON/YAML/TOML parsing, structured validation, and
  richer dispatch logic.

Simple one-line tool aliases can remain as string tasks or package scripts.

## Migration strategy

The implementation is intentionally phased:

1. Update the guide first so every later edit has a reviewed policy.
2. Inventory tasks and scripts before changing names.
3. Migrate low-risk task families first.
4. Migrate package script references only after canonical mise commands exist.
5. Preserve hidden wrappers for renamed tasks during transition.
6. Update documentation after each command family changes.
7. Close with parsing, listing, smoke checks, and the full quality gate.

## Documentation strategy

Docs must point to canonical mise commands. When a compatibility wrapper remains,
the docs mention it only if the wrapper is user-facing. References to old
commands are updated in:

- `README.md`,
- `AGENTS.md`,
- `CLAUDE.md`,
- `assets/guides/*.md`,
- `assets/docs/specs/**/*.md`,
- `.cursor` guidance when relevant.

## Error handling

The implementer must stop and report before rewriting a task when:

- the task is destructive and lacks a safe dry-run,
- the task is release-facing and behavior cannot be verified locally,
- merging tasks would hide a safety distinction,
- a package script is required by a third-party tool,
- command references conflict across guides.

The report must include the task name, current command, proposed canonical
command, risk, and recommended next step.

## Testing strategy

Every phase runs:

1. `bun run lint:mise`.
2. `mise tasks` or `mise tasks info <task>` for changed tasks.
3. `mise run <task> --help` for tasks with `usage`.
4. A low-risk smoke command for changed dispatch logic.
5. `git diff --check` for touched docs and TOML.
6. The full quality gate before completing implementation phases that touch
   executable workflows.

Dangerous tasks use help, listing, validation, or dry-run checks instead of
executing the destructive action.

## Decision: Guided migration with compatibility wrappers

**Context:** The project has active agents, existing documentation, and scripts
that may be used by CI or developer muscle memory.

**Options considered:**

1. Rewrite everything in one pass. Pros: fastest final state. Cons: high risk
   of breaking CI or confusing active agents.
2. Guided phased migration with hidden wrappers. Pros: safe, traceable, and
   compatible with existing references. Cons: temporary duplication remains.
3. Docs-only policy update. Pros: lowest risk. Cons: leaves `mise.toml` drift in
   place.

**Decision:** Use guided phased migration with hidden wrappers for renamed task
families.

**Rationale:** It gives the repository a clear target while preserving safe
handoff between active agents and current docs.

