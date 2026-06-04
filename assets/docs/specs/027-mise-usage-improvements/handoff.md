<!-- markdownlint-disable-file -->
# Mise usage improvements — Handoff

## Status

This handoff is for the full Mise task contract cleanup in
`/Users/roalcantara/Work/bun/app`.

The work is not a partial policy-checker cleanup. It is complete only when the
exact public task surface, exact package script surface, Usage contracts,
workflow commands, documentation references, and command validation matrix all
match this document.

Every implementation task in `tasks.md` has acceptance criteria. A checkbox is
not complete unless the task's command-specific validation commands have been
run and recorded under that task's `Evidence:` bullet.

## Required reading

Read these files before editing:

- `AGENTS.md`
- `assets/guides/MISE_GUIDE.md`
- `assets/docs/specs/mise-usage/requirements.md`
- `assets/docs/specs/mise-usage/design.md`
- `assets/docs/specs/mise-usage/tasks.md`
- `assets/docs/specs/mise-usage-improvements/requirements.md`
- `assets/docs/specs/mise-usage-improvements/design.md`
- `assets/docs/specs/mise-usage-improvements/tasks.md`
- `mise.toml`
- `package.json`
- `.github/workflows/review.yml`
- `.github/workflows/release.yml`
- `.github/workflows/publish.yml`

Load these skills:

- `app-context`
- `mise-tasks`
- `docs-writer`
- `mise-expert` only if you touch `[tools]`, `[env]`, setup behavior, or tool
  versions
- `app-quality-gate` before declaring completion

## Non-negotiable rules

- Do not add deprecated compatibility wrappers.
- Do not weaken the policy checker to make it pass.
- Do not mark checkboxes complete with a bulk script.
- Do not mark a task complete until its acceptance criteria and command
  validation checks pass.
- Do not execute destructive repository, release, publish, remote deletion, or
  mutation behavior without explicit user approval for that exact command.
- Do not edit expected snapshots in this handoff unless the maintainer approves
  the replacement snapshot before implementation.
- Preserve unrelated user or other-agent changes in the working tree.

## Expected public task surface

Run:

```sh
NO_COLOR=1 COLUMNS=120 mise tasks
```

Expected output:

```txt
ci       Run review, release, and publish CI workflows
lint     Run lint, strict lint, fix, report, and graph workflows
perf     Run preview-server performance benchmark workflows
policy   Check Mise task policy and usage specs
project  Manage setup, dependencies, cleanup, icons, repository, and local maintenance
skill    Validate, generate, install, and report skill registry artifacts
test     Run unit, CI, e2e preview, spec audit, and spec style checks
```

The output must match line by line. Extra public tasks, missing tasks, renamed
tasks, reordered tasks, changed descriptions, or spacing drift fail this
handoff.

## Expected package script surface

Run:

```sh
node -e "const s=require('./package.json').scripts; console.log(Object.keys(s).join('\n'))"
```

Expected output:

```txt
start
dev
dev:verbose
dev:debug
dev:trace
dev:kill
build
build:prod
build:insecure-local
test
typecheck
lint
lint:strict
lint:fix
lint:biome
lint:biome:strict
lint:biome:fix
lint:biome:format
lint:mise
lint:knip
lint:depcruise
lint:jscpd
lint:ls
lint:ast-grep
lint:ast-grep:fix
e2e:preview:install
e2e:preview
e2e:preview:ui
```

No script ending in `:ci` may remain unless the maintainer approves a specific
exception before implementation. `release:ci`, `lint:depcruise:graph`, and
package-level cleanup aliases are removed because Mise owns those workflows.

## Expected command contracts

### `ci`

`mise run ci` must be equivalent to:

```sh
mise run project prepare --ci
mise run ci review --lint --test --build
```

`mise run ci review` must default to:

```sh
mise run ci review --lint --test --build
```

Selected review flags must run only selected phases:

```sh
mise run ci review --lint
mise run ci review --test
mise run ci review --build
mise run ci review --lint --test
mise run ci review --lint --test --build
```

`mise run ci release` must support these independent flags:

```sh
mise run ci release --check-signing
mise run ci release --check-squash
mise run ci release --dry-run
mise run ci release --notes
mise run ci release --check-signing --check-squash --dry-run --notes
```

`mise run ci release` with no flags must fail before doing release work and
print a message explaining the available flags.

`mise run ci publish` must support these subcommands:

```sh
mise run ci publish build
mise run ci publish package --version v0.0.0 --target linux-x64
mise run ci publish package --version v0.0.0 --target linux-arm64
mise run ci publish package --version v0.0.0 --target darwin-arm64
mise run ci publish checksum
```

`ci publish package` must reject missing `--version` and invalid targets before
packaging logic runs.

### `project`

`mise run project` must show help or run a safe default. It must not run
cleanup, repository, or icon mutation by accident.

`project` must support:

```sh
mise run project setup
mise run project prepare
mise run project prepare --ci
mise run project clean
mise run project cleanup
mise run project reinstall
mise run project icons
mise run project icons --fix
mise run project repo setup
mise run project repo prune
mise run project repo reset
```

`project repo prune` and `project repo reset` must be validated through help,
Usage metadata, shell syntax, and confirmation behavior only. Do not execute
their destructive paths without explicit maintainer approval.

### `lint`

`lint` must support:

```sh
mise run lint check
mise run lint check --biome --knip --depcruise --jscpd --ls --ast-grep --mise --typecheck
mise run lint check --biome --ci
mise run lint fix
mise run lint fix --biome --ast-grep
mise run lint graph
```

`lint graph` must write a Mermaid dependency graph to
`tmp/reports/dependency-graph.mmd`. It must not require Graphviz `dot`.

### `policy`

`policy` must support:

```sh
mise run policy check
mise run policy check --strict
mise run policy check --format=json
```

Strict text output must be exactly:

```txt
policy check: no findings
```

JSON output must contain:

```json
{"findings":[]}
```

Additional JSON fields are allowed, but `findings` must exist and be an empty
array.

### `test`, `skill`, and `perf`

Existing behavior must remain reachable through self-documented Usage commands.
Use `usage_cmd` for subcommands and explicit choices for bounded values.

## Command validation matrix

Run this matrix after implementation. Record pass/fail evidence in
`tasks.md`.

### Discovery checks

```sh
NO_COLOR=1 COLUMNS=120 mise tasks
mise tasks --hidden
mise tasks validate
node -e "const s=require('./package.json').scripts; console.log(Object.keys(s).join('\n'))"
```

### Help checks

```sh
mise run ci --help
mise run ci review --help
mise run ci release --help
mise run ci publish --help
mise run ci publish package --help
mise run project --help
mise run project repo --help
mise run project icons --help
mise run lint --help
mise run policy --help
mise run test --help
mise run skill --help
mise run perf --help
```

### Negative Usage parsing checks

Each command must exit non-zero before executing task work:

```sh
mise run ci release
mise run ci publish package --target linux-x64
mise run ci publish package --version v0.0.0 --target windows-x64
mise run ci publish build --version v0.0.0
mise run project repo delete
mise run lint check --unknown-tool
mise run policy check --format=yaml
```

### Safe smoke and dry-run checks

Run safe commands that do not mutate remotes or release state:

```sh
bun run lint:mise
mise run policy check --strict
mise run policy check --format=json
mise run lint graph
mise run test spec-style --scope shared --format text
mise run test spec-audit
mise run ci review --lint
mise run ci review --test
mise run ci review --build
mise run ci release --check-squash
mise exec -- actionlint
git diff --check
```

### Unsafe metadata-only checks

Do not run destructive paths. Validate these through help, Usage metadata,
syntax, negative parsing checks, and confirmation behavior:

```txt
mise run project repo prune
mise run project repo reset
mise run ci release --check-signing
mise run ci release --dry-run
mise run ci release --notes
mise run ci publish build
mise run ci publish package --version v0.0.0 --target linux-x64
mise run ci publish package --version v0.0.0 --target linux-arm64
mise run ci publish package --version v0.0.0 --target darwin-arm64
mise run ci publish checksum
```

If an unsafe command gains a true dry-run flag, add that dry-run command to the
safe matrix and keep the real mutation out of automation.

## Stale-reference searches

Run these searches and resolve current-doc hits:

```sh
rg -n "bun run [^\\n]*:ci|release:ci|lint:depcruise:graph" package.json .github README.md AGENTS.md CLAUDE.md .cursor assets/guides assets/docs/specs
rg -n "mise run (release|publish|repo|icons)(\\s|$)" README.md AGENTS.md CLAUDE.md .cursor assets/guides assets/docs/specs
rg -n "usage_action" mise.toml assets/guides assets/docs/specs
```

Historical references may remain only when the surrounding document explicitly
marks them as historical. Current guidance must use canonical commands.

## Final validation commands

The work is not done until all of these pass:

```sh
bun run lint:mise
mise run policy check --strict
mise run policy check --format=json
NO_COLOR=1 COLUMNS=120 mise tasks
mise tasks validate
bun run typecheck
bash .agents/skills/app-quality-gate/scripts/gate.sh
git diff --check
```

## Exact handoff prompt

Copy and paste this prompt into another agent if needed:

```txt
Continue the Mise usage improvements work in /Users/roalcantara/Work/bun/app.

Read AGENTS.md, assets/guides/MISE_GUIDE.md, assets/docs/specs/mise-usage/,
assets/docs/specs/mise-usage-improvements/, mise.toml, package.json, and
.github/workflows/{review,release,publish}.yml before editing.

Load app-context, mise-tasks, and docs-writer. Load mise-expert only if you touch
[tools], [env], setup behavior, or tool versions. Load app-quality-gate before
declaring completion.

Implement the full task contract cleanup from
assets/docs/specs/mise-usage-improvements/tasks.md. Do not add deprecated
compatibility wrappers. Do not weaken the policy checker. Do not bulk-edit
checkboxes. Every checked task must include an Evidence bullet naming changed
files, exact commands, and the command-level acceptance criteria that passed.

The expected public task surface is exactly the output recorded in
assets/docs/specs/mise-usage-improvements/handoff.md. The expected
package.json script key list is exactly the output recorded in the same handoff.
Do not edit either expected snapshot unless the maintainer explicitly approves a
new snapshot before implementation.

Use Usage cmd nodes and usage_cmd for subcommands. Use boolean flags for
independent combinable operations such as ci review phases and ci release
checks. Use nested commands for operations with scoped required inputs or unsafe
behavior, especially ci publish package and project repo commands. Use choices
for bounded values, including linux-x64, linux-arm64, and darwin-arm64.

Move release and publish under ci. Move repo and icons under project. Remove
top-level release, publish, repo, and icons tasks. Remove obsolete package
scripts ending in :ci and update GitHub workflows to call canonical Mise
commands directly.

Run the command validation matrix in handoff.md. The work is only done when:

1. NO_COLOR=1 COLUMNS=120 mise tasks matches the expected output exactly.
2. The package script key command matches the expected output exactly.
3. mise run policy check --strict prints exactly "policy check: no findings".
4. mise run policy check --format=json contains findings=[].
5. Every changed public task has help output plus a safe smoke, dry-run, or
   negative Usage parsing check.
6. Unsafe repository, release, and publish mutations were not executed without
   explicit maintainer approval for the exact command.
7. bun run lint:mise, mise tasks validate, bun run typecheck,
   bash .agents/skills/app-quality-gate/scripts/gate.sh, and git diff --check
   all pass.

Final response must include git status --short, exact mise tasks output, exact
policy strict output, JSON findings count, and command-by-command validation
results.
```
