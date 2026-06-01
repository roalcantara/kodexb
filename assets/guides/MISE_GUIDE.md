---
title: Mise task guidelines
description: Project policy for mise tasks, usage specs, and automation entrypoints
---
<!-- markdownlint-disable-file -->

This project uses Mise as the canonical entrypoint for project automation.
`mise.toml` owns workflows that require orchestration, arguments, setup, safety
checks, or agent discoverability. `package.json` scripts may remain for simple
Bun/tool aliases or third-party integration points, but complex project
workflows must move behind Mise tasks.

## Authoring workflow

Use this workflow before creating or changing project automation:

1. Load the `app-context` skill.
2. Load `mise-tasks` before editing `mise.toml` tasks, task arguments,
   dependencies, or task dispatch.
3. Load `mise-expert` when changing `[tools]`, `[env]`, setup behavior, or tool
   version assumptions.
4. Update this guide or the relevant spec before changing policy.
5. Run the verification commands listed in this guide.

Do not weaken the quality gate or add ignore rules to make a task pass. Fix the
task, split responsibilities, or record a narrow exception in the relevant spec.

## Canonical task shape

Define public project tasks as inline task objects under the root `[tasks]`
table. This keeps the public task surface easy to scan and makes policy validation
straightforward.

```toml
[tasks]
"test" = { description = "Run project test workflows", dir = "{{cwd}}", usage = '''
arg "<target>" help="Test target" {
  choices "unit" "e2e-preview" "spec-audit" "spec-style"
}
flag "--strict" help="Exit non-zero when findings exist"
''', run = '''
#!/usr/bin/env bash
set -euo pipefail

case "${usage_target?}" in
  unit) bun test --pass-with-no-tests ;;
  e2e-preview) bunx playwright test e2e/preview_list_nav.e2e.spec.ts ;;
  spec-audit) mise run test spec-audit ;;
  spec-style) mise run test spec-style ;;
esac
''' }
```

Allowed exceptions:

- `task_templates` may be used for reusable internals when Mise template support
  is enabled and the calling task remains the documented public entrypoint.
- Existing table-style tasks may remain only as temporary migration exceptions
  recorded in the active spec.

## Usage specs

Parameterized tasks must use Mise `usage` specs instead of ad hoc user-facing
environment variables. The outer task definition is TOML. The `usage = '''...'''`
body is Usage/KDL.

Use subcommands when one public task dispatches related operations:

```kdl
cmd "check" {}
cmd "fix" {}
cmd "report" {}
```

Use flags for optional behavior:

```kdl
flag "--strict" help="Exit non-zero when findings exist"
flag "--format <format>" help="Output format" default="text" {
  choices "text" "json"
}
```

Task bodies read Mise-generated `usage_*` variables:

```bash
case "${usage_cmd?}" in
  check) run_check ;;
  fix) run_fix ;;
  report) run_report "${usage_format:-text}" ;;
esac
```

Rules:

- Every user-facing argument or flag must have help text.
- Arguments and flags with a bounded value set must define `choices`.
- Boolean flags must use parameter expansion in shell bodies, for example
  `${usage_strict:-false}` or `${usage_strict:+--strict}`.
- Conventional process environment variables, such as `CI` or tool-specific
  environment values, may remain environment variables when the underlying tool
  owns them.
- Embedded `usage` specs must pass `usage lint -W -` after adding a synthetic
  `name "<task>"` line for standalone linting.

## Merging similar tasks

Prefer one public task with an action argument over several near-duplicate task
names when the actions share a domain and implementation surface.

Use this shape:

```sh
mise run skill validate
mise run skill sync
mise run skill install
```

Avoid this shape for new public tasks:

```sh
mise run skill validate
mise run skill sync
mise run skill install
```

Keep tasks separate only when separation protects clarity or safety:

- The actions have different safety profiles.
- One action is destructive and another is read-only.
- The actions target different environments.
- Separate tasks mirror CI steps and materially improve debugging.
- A third-party tool requires the exact entrypoint.

Do not keep deprecated task names before the product has external users. Remove
old names during the same change that introduces the canonical task. Reconsider
hidden compatibility tasks only after the product has released command contracts
that other people or systems depend on.

## Package scripts

`package.json` scripts are allowed when they are simple tool aliases or package
manager integration points.

Allowed examples:

```json
{
  "scripts": {
    "test": "bun test --pass-with-no-tests",
    "lint:mise": "mise exec -- tombi check mise.toml",
    "lint": "mise run lint"
  }
}
```

Complex package scripts must move to Mise or delegate to Mise. A package script
is complex when it contains orchestration such as `&&`, `||`, `;`, pipes,
redirects, loops, temporary directories, report generation, cleanup, or multiple
tool invocations.

## Standalone scripts

Do not add standalone project automation scripts as public entrypoints. Project
automation must be discoverable through `mise tasks`.

Allowed exceptions:

- Editor-only hooks under `.cursor/`.
- Skill implementation files under `.agents/skills/*/scripts/`, provided the
  documented project command points to a canonical Mise task.
- Internal helpers under `tools/`, provided they are invoked by a canonical Mise
  task and are not documented as the primary user command.

If a script remains as an implementation detail, documentation must point users
and agents to the Mise task, not directly to the script.

## Complex task bodies

Use a shebang for complex inline task bodies.

Use Bash for shell orchestration:

```toml
run = '''
#!/usr/bin/env bash
set -euo pipefail

mkdir -p tmp/reports
bun test --reporter=junit --reporter-outfile=tmp/reports/junit.xml
'''
```

Use Bun for structured parsing or richer validation:

```toml
run = '''
#!/usr/bin/env bun

const config = Bun.TOML.parse(await Bun.file("mise.toml").text())
console.log(Object.keys(config.tasks ?? {}).sort().join("\n"))
'''
```

Simple one-line task aliases may stay as plain strings when they do not need
arguments, branching, cleanup, or report handling.

## Destructive tasks

Destructive, release-facing, network-facing, or environment-mutating tasks must
be explicit and safe to inspect.

Rules:

- Add `confirm` for destructive tasks.
- Prefer a `--dry-run` flag when the underlying operation can support it.
- Validate dangerous tasks with `mise tasks`, `mise run <task> --help`, and
  dry-run behavior instead of executing the destructive path.
- Keep separate task names when merging would make destructive behavior easier
  to trigger by accident.

## Verification

Run these checks after changing Mise policy, tasks, or command references:

```sh
bun run lint:mise
mise tasks --hidden
mise tasks validate
mise run <changed-task> --help
git diff --check
```

When the `policy check` task exists, also run:

```sh
mise run policy check
```

Before declaring implementation complete, run the repository quality gate:

```sh
bash .agents/skills/app-quality-gate/scripts/gate.sh
```

Future work may replace the direct gate script entrypoint with a canonical Mise
task. Until then, treat the script as the current executable authority and keep
new automation discoverable through Mise.

## References

- [Mise task runner](https://mise.jdx.dev/tasks/)
- [Mise TOML tasks](https://mise.jdx.dev/tasks/toml-tasks.html)
- [Mise task arguments](https://mise.jdx.dev/tasks/task-arguments.html)
- [Mise task templates](https://mise.jdx.dev/tasks/templates.html)
- [Usage specification](https://usage.jdx.dev/spec/)
- [Usage lint](https://usage.jdx.dev/cli/reference/lint)
- [Usage JSON generation](https://usage.jdx.dev/cli/reference/generate/json)
