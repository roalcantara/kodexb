<!-- markdownlint-disable-file -->
# Mise usage improvements — Design

## Overview

This change turns the Mise task surface into a small command-line product. The
public surface stays compact, command help explains required inputs, and every
behavior gets either a safe smoke check or a documented non-execution
validation path.

The key design rule is simple: use flags for operations that can be selected
together, and use nested commands when an operation has its own argument
contract or safety boundary. This avoids the ambiguous `arg "<action>"`
pattern for tasks such as `publish`, where only one action needs `--version`
and `--target`.

## Public task architecture

The final public task surface contains only these root tasks:

```txt
ci       Run review, release, and publish CI workflows
lint     Run lint, strict lint, fix, report, and graph workflows
perf     Run preview-server performance benchmark workflows
policy   Check Mise task policy and usage specs
project  Manage setup, dependencies, cleanup, icons, repository, and local maintenance
skill    Validate, generate, install, and report skill registry artifacts
test     Run unit, CI, e2e preview, spec audit, and spec style checks
```

The removed root tasks become nested command groups:

- `release` becomes `mise run ci release ...`.
- `publish` becomes `mise run ci publish ...`.
- `repo` becomes `mise run project repo ...`.
- `icons` becomes `mise run project icons ...`.

## Usage model

Usage `cmd` nodes define subcommands. The task body reads the selected
subcommand from `usage_cmd`. Boolean flags define independent phases that can
run together in one invocation.

Recommended patterns:

- Use `cmd` for `ci publish build`, `ci publish package`, and
  `ci publish checksum` because `package` owns required and constrained flags.
- Use flags for `ci release --check-signing --check-squash --dry-run --notes`
  because those release checks are independent and can run together.
- Use flags for `ci review --lint --test --build` because review phases are
  independent and can run as a subset.
- Use `cmd` for unsafe repository operations such as `project repo prune` and
  `project repo reset` because they are not naturally combinable.

Example shape for scoped publish inputs:

```kdl
cmd "publish" help="Build, package, and checksum release artifacts" {
  cmd "build" help="Build production Electrobun artifacts"
  cmd "package" help="Package built artifacts for one release target" {
    flag "--version <version>" help="Release version or tag" required=#true
    flag "--target <target>" help="Artifact target" {
      choices "linux-x64" "linux-arm64" "darwin-arm64"
    }
  }
  cmd "checksum" help="Write checksums.txt for packaged artifacts"
}
```

## Package script architecture

`package.json` keeps only scripts that are useful as direct package-manager
entrypoints. Mise owns orchestration, CI composition, task discovery, and
command contracts.

Allowed package-script categories:

- Electrobun lifecycle aliases: `start`, `dev`, `dev:*`, and `build:*`.
- Primitive tool aliases: direct single-tool lint/test/typecheck commands.
- Developer muscle-memory aliases: `test`, `lint`, `lint:fix`, and
  `typecheck`, as long as they do not duplicate Mise orchestration.
- Direct Mise delegations when a package-manager entrypoint is intentionally
  useful.

Scripts ending in `:ci` are removed unless an external integration requires
that exact package script. GitHub Actions call Mise directly.

## CI workflow architecture

The review workflow calls canonical Mise commands directly. It may still keep
separate steps for report upload and JUnit summary publishing, but the commands
that produce lint and test behavior come from Mise.

Release and publish workflows use the same task contracts that local
development uses. Workflow-only logic can remain in YAML when it depends on
GitHub context, secrets, matrix values, artifact upload, attestation, or a
reusable GitHub action.

## Validation architecture

Validation has four layers:

1. **Static policy validation:** `mise run policy check --strict` verifies
   task shape, Usage linting, expected root tasks, package script surface, and
   stale references.
2. **Discovery validation:** `NO_COLOR=1 COLUMNS=120 mise tasks` proves the
   public task list matches the accepted contract.
3. **Usage parsing validation:** help commands, invalid choices, missing
   required flags, and unexpected flags prove Usage rejects bad input before
   task bodies run.
4. **Behavior validation:** safe smoke or dry-run commands prove selected
   commands still perform the expected work. Unsafe commands are validated by
   help, metadata, syntax, and negative parsing checks only.

The implementer records command evidence in `tasks.md`. A command is not
considered validated merely because the task exists in `mise.toml`.

## Validation matrix

The handoff contains the exact command matrix. The matrix intentionally mixes
positive, negative, and metadata-only checks:

- Positive checks prove safe commands work.
- Negative checks prove Usage contracts prevent invalid calls.
- Metadata-only checks avoid destructive behavior while still proving the task
  is documented and parseable.

The final pass also runs:

```sh
bun run lint:mise
mise run policy check --strict
mise run policy check --format=json
NO_COLOR=1 COLUMNS=120 mise tasks
mise tasks validate
bun run typecheck
bash .agents/skills/app-quality-gate/scripts/gate.sh
```

## Decisions

### Decision: Prefer flags only for combinable operations

**Context:** Flags make `ci release --check-signing --check-squash --dry-run`
ergonomic and self-documenting, but flags are a poor fit for mutually exclusive
or unsafe actions.

**Decision:** Use flags for independent phases and nested commands for
distinct behavior.

**Rationale:** This gives `release` the composability the user wants while
keeping `publish package` and repository mutations precise and safe.

### Decision: Treat exact output as an acceptance artifact

**Context:** Previous handoffs let another agent satisfy the general idea while
missing the intended task contract.

**Decision:** The handoff records exact `mise tasks` output and exact package
script keys.

**Rationale:** Exact snapshots remove room for accidental partial compliance.
If the contract changes, the maintainer must approve a new snapshot before
implementation proceeds.

### Decision: Validate unsafe tasks without executing them

**Context:** Repository reset, repository prune, release mutation, and publish
mutation can damage local or remote state.

**Decision:** Automated validation for unsafe commands uses help output,
Usage-generated metadata, shell syntax, negative parsing checks, and explicit
dry-run modes. Destructive execution requires separate user approval for the
exact command.

**Rationale:** The contract must be proven without making validation dangerous.
