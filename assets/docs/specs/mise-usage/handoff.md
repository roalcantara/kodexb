<!-- markdownlint-disable-file -->
# Mise usage policy — Handoff

## Status

This handoff is for completing the remaining Mise task refactor after Phase 1
created the read-only policy checker.

## Context

The user wants Mise task policy to become enforceable. The earlier
`normalise-tasks` work left useful direction but did not leave a complete audit
record or a machine-enforced policy. A small POC proved that embedded
`usage = '''...'''` specs can be extracted from `mise.toml`, prefixed with
`name "<task>"`, and validated with:

```sh
usage lint -W -
usage generate json -f -
```

The implementation must keep `mise.toml` as the executable source of truth and
use Usage tooling for Usage/KDL validation instead of writing a custom KDL
parser.

Phase 1 is complete. The current checker entrypoint is:

```sh
mise run policy check
```

The current advisory baseline is 23 findings:

- 4 table-style task definitions.
- 4 split task families.
- 15 complex package scripts.

Deprecated task wrappers were intentionally removed instead of preserved because
the product has not released a public command contract.

## Required reading

- `AGENTS.md`
- `assets/guides/MISE_GUIDE.md`
- `assets/docs/specs/mise-usage/requirements.md`
- `assets/docs/specs/mise-usage/design.md`
- `assets/docs/specs/mise-usage/tasks.md`
- `assets/docs/specs/normalise-tasks/` as historical context only
- `mise.toml`
- `package.json`
- `[tasks.policy]` inline Bun script in `mise.toml`
- `.agents/skills/kb-context/SKILL.md`
- `.agents/skills/kb-quality-gate/SKILL.md`

Load these skills:

- `kb-context`
- `docs-writer`
- `mise-tasks`
- `mise-expert` only when touching `[tools]`, `[env]`, setup behavior, or tool
  versions
- `kb-quality-gate` before declaring implementation complete

## Implementation constraints

- Do not execute destructive tasks.
- Do not weaken the policy checker to make it pass.
- Do not preserve deprecated task names by default; this product has not
  released a public command contract yet.
- Do not add a generic KDL parser for the first implementation.
- Do not rewrite unrelated command examples in historical specs unless they are
  actively referenced.
- Preserve user or other-agent changes in the working tree.

## Objective

Complete Phases 2 through 5 in `tasks.md`. Resolve the advisory findings by
refactoring task shape, task families, package scripts, and documentation
references. Prefer removing obsolete names over keeping compatibility wrappers.

When task families are merged, preserve behavior through the new Usage syntax.
Each old behavior must have a clear migration path:

- same command still works because it remains intentionally canonical,
- or the behavior is available through a new action or flag,
- or the old behavior was obsolete and was removed with rationale in the spec.

## Required validation

The work is not done until all non-destructive verification commands pass:

```sh
mise run policy check --strict
mise tasks validate
mise tasks --hidden
bun run lint:mise
bun run typecheck
bash .agents/skills/kb-quality-gate/scripts/gate.sh
```

Strict mode means zero policy findings. It is not enough for
`mise run policy check --strict` to exit 0 while printing advisory `info`
findings. The final checker output must satisfy both checks:

```sh
mise run policy check --strict
mise run policy check --format=json
```

- Text output must be exactly `policy check: no findings`.
- JSON output must contain an empty `findings` array.
- No rule may be downgraded to `info`, deleted, or allowlisted just to make
  strict mode pass.

For every changed, merged, or removed task:

- Run the relevant `mise run <task> --help` command.
- Run a safe smoke check or dry-run path when one exists.
- Do not run destructive release, publish, repository deletion, remote deletion,
  or mutation tasks unless the user explicitly approves that exact command.
- For unsafe tasks, verify Usage metadata, help output, and shell syntax only.

The final task surface must satisfy:

- `mise run policy check --strict` exits 0.
- `mise tasks validate` exits 0.
- Every task in `mise.toml`, including hidden and internal tasks, was reviewed
  and updated to the canonical syntax. There are no unreviewed exceptions.
- Every task left in `mise.toml` still works as expected with the new syntax.
- No deprecated compatibility wrappers remain unless the user explicitly
  changes the product policy.
- README, agent docs, Cursor guidance, package scripts, and active specs point
  to canonical commands.
- The final `NO_COLOR=1 COLUMNS=120 mise tasks` output matches the expected
  public task surface recorded in this handoff.

## Expected public task surface

This is the required final public task surface. Do not update this expected
output during implementation unless the maintainer explicitly approves a new
snapshot before the refactor begins.

Run:

```sh
NO_COLOR=1 COLUMNS=120 mise tasks
```

Expected output:

```txt
ci       Run CI review and local verification workflows
icons    Check and optionally fix SVG icon contrast
lint     Run lint, strict lint, fix, report, and graph workflows
perf     Run preview-server performance benchmark workflows
policy   Check Mise task policy and usage specs
project  Manage setup, dependencies, cleanup, and local maintenance
publish  Build, package, and checksum release artifacts
release  Check signing, squash state, dry-run release, and notes
repo     Manage GitHub repository setup, pruning, and reset workflows
skill    Validate, generate, install, and report skill registry artifacts
test     Run unit, CI, e2e preview, spec audit, and spec style checks
```

The implementation is not complete unless the actual command output matches the
expected output above line by line. Extra public tasks, missing tasks, renamed
tasks, changed descriptions, changed ordering, or spacing drift all fail the
handoff.

Do not hide old public tasks as compatibility wrappers. Hidden tasks may exist
only as implementation helpers, and they must not preserve deprecated public
entrypoints such as `ci:review:lint`, `repo:setup`, `setup`, or
`test:spec-audit`.

## Expected command contracts

The public task surface alone is not enough. The implementation must also
preserve the behavior below through Usage actions and flags.

### `ci`

`mise run ci` must be equivalent to:

```sh
mise run prepare && mise run ci review --lint --test --build
```

`mise run ci review` must default to the full review flow:

```sh
mise run ci review --lint --test --build
```

`mise run ci review --lint --test --build` must run the previous review
subtasks in this order:

```sh
bun run lint
bun run test:ci
bun run build:insecure-local
```

Individual flags select subsets:

- `mise run ci review --lint` runs only the previous `ci:review:lint` behavior.
- `mise run ci review --test` runs only the previous `ci:review:test` behavior.
- `mise run ci review --build` runs only the previous `ci:review:build`
  behavior.

`mise run ci` must not run release, publish, repository setup, repository prune,
or reset behavior.

## Completion evidence

Do not bulk-edit checkboxes. Each checked item in `tasks.md` must include an
`Evidence:` bullet naming the files changed and the commands that verified that
specific item. The final report must include:

- `git status --short`, showing only intended changes plus acknowledged
  pre-existing unrelated files.
- The exact `NO_COLOR=1 COLUMNS=120 mise tasks` output.
- The exact `mise run policy check --strict` output.
- The parsed count from `mise run policy check --format=json`.
- The task-by-task smoke, dry-run, or unsafe-metadata verification list.

Useful focused checks while iterating:

```sh
bun run lint:mise
mise run policy check
mise run policy check --format=json
mise tasks --hidden
git diff --check
```

Run focused file checks for touched policy code:

```sh
bun run lint:mise
mise run policy check --strict
```

## Agent prompt

Use this prompt if another agent needs to complete the work:

```txt
Continue the Mise usage policy refactor in /Users/roalcantara/Work/bun/kb.

First read AGENTS.md, assets/guides/MISE_GUIDE.md, the full
assets/docs/specs/mise-usage/ spec package, mise.toml, package.json, and
the `[tasks.policy]` run block in mise.toml. Treat assets/docs/specs/normalise-tasks/ as
historical context only.

Load kb-context, docs-writer, mise-tasks, and kb-quality-gate. Load mise-expert
only if you touch [tools], [env], setup behavior, or tool versions.

Phase 1 already exists: mise run policy check reports the current advisory
baseline. Complete Phases 2 through 5 in assets/docs/specs/mise-usage/tasks.md.
Resolve policy findings by refactoring tasks, package scripts, and docs. Do not
weaken the checker, do not add deprecated compatibility wrappers, and do not
execute destructive tasks without explicit user approval.

The work is only done when mise run policy check --strict prints exactly
"policy check: no findings", mise run policy check --format=json reports
findings=[], mise tasks validate exits 0, and every task left in mise.toml
still works as expected with the new Usage syntax. For each changed or merged
task, verify help output and a safe smoke or dry-run path. For unsafe tasks,
verify metadata, help output, and syntax only.

Do not mark checkboxes complete with a bulk script. Each checked item must have
an Evidence bullet naming changed files and commands. The final
NO_COLOR=1 COLUMNS=120 mise tasks output must byte-for-byte match the expected
public task surface recorded in handoff.md. Do not edit that expected task
surface during implementation unless the maintainer explicitly approves the new
snapshot first.

Before declaring completion, run bun run lint:mise, bun run typecheck, and
bash .agents/skills/kb-quality-gate/scripts/gate.sh. Update README, AGENTS,
Cursor guidance, package scripts, and active specs so they reference canonical
commands.
```
