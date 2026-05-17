<!-- markdownlint-disable-file -->
# Skills normalisation handoff

Use this prompt to hand the final schema-normalisation pass to another agent.
The goal is to make `assets/guides/SKILLS.yml` safe by construction: one
`location` field replaces `source + install`, and one discriminated
`policy.type` replaces `decision + link + load + when`.

## Handoff prompt

```markdown
You are working in `/Users/roalcantara/Work/bun/kb`.

Goal: Refactor `assets/guides/SKILLS.yml` to the final no-contradiction skill
registry schema. The new schema must eliminate contradictory states by using:

- `location: owned | project | global`
- `policy.type: required | routed | optional | reference | blocked`

The implementation must remove the old skill-level fields `source`, `install`,
`link`, `decision`, `load`, and top-level `electrobun_routing`.

Before editing:

1. Read `.agents/skills/kb-context/SKILL.md`.
2. Because this touches `mise.toml`, use the `mise-tasks` skill if available.
   Specifically, use its task-argument guidance and the official mise
   [`usage` field documentation](https://mise.jdx.dev/tasks/task-arguments.html).
3. Because this writes Markdown, use the docs-writing guidance available in
   this repo/session.
4. Keep the change scoped to:
   - `assets/guides/SKILLS.yml`
   - `mise.toml`
   - generated outputs from `mise run skill sync`
   - `assets/guides/SKILLS.md`
   - `assets/docs/specs/skills-normalisation/*` only if the implementation
     reveals a gap in this handoff
5. Do not revert unrelated dirty files.

## Final schema concepts

Use `location` to describe where the repo expects the skill to live. This uses
the `skills` CLI's project/global vocabulary and adds `owned` for kb-authored
skills. Do not split source scope and install method into separate YAML fields.

| `location` | Meaning |
| --- | --- |
| `owned` | Project-authored skill committed under `.agents/skills/<skill-id>`. |
| `project` | External skill managed by the Skills CLI, recorded in `skills-lock.json`, and restored into `.agents/skills/<skill-id>`. |
| `global` | Global skill used from `$HOME/.agents/skills/<skill-id>` and not materialized in the project. |

Use `policy.type` to describe how agents treat the skill:

| `policy.type` | Meaning |
| --- | --- |
| `required` | Standing project skill that must be loaded for its domain. |
| `routed` | Skill selected by generated routing tables. |
| `optional` | Optional companion loaded manually for specific situations. |
| `reference` | Upstream reference only. |
| `blocked` | Do not use directly in kb. |

Do not reintroduce separate skill-level `source`, `install`, `link`,
`decision`, or `load` fields. `location` and `policy.type` are the two axes.
Do not model the CLI's copy or symlink materialization mode in YAML; the Skills
CLI owns that detail through `skills-lock.json` and `skills experimental_install`.

## Desired YAML shapes

Required owned skill:

```yaml
skills:
  kb-context:
    location: owned
    rationale: Mandatory project orientation. It defines FCIS, allowed RPC shape, guide routing, and the project quality workflow.
    policy:
      type: required
      usage:
        summary: Always load at the start of any kb task.
        when:
          load:
            - any kb task
          avoid: []
```

Routed project skill:

```yaml
skills:
  electrobun-rpc:
    location: project
    rationale: Use for native Electrobun IPC only. App-level kb RPC remains owned by kb-rpc.
    policy:
      type: routed
      usage:
        summary: Native Electrobun IPC.
        when:
          load:
            - BrowserView.defineRPC
            - Electroview.defineRPC
            - ElectrobunRPCSchema
          avoid:
            - app-level Elysia and Eden Treaty RPC
      routing:
        electrobun:
          - order: 40
            triggers:
              - Typed RPC
              - Electroview.defineRPC
              - schema bun/webview
              - rpc.client
            note: native IPC transport only
```

Optional global skill:

```yaml
skills:
  mise-tasks:
    location: global
    rationale: Useful for mise task definitions, dependencies, aliases, and multi-step workflow orchestration.
    policy:
      type: optional
      usage:
        summary: Mise task orchestration.
        when:
          load:
            - editing mise.toml
            - task dependencies
            - multi-step project workflows
          avoid:
            - runtime feature implementation with no task changes
      surfaces:
        claude_optional: when editing mise.toml or task orchestration
        kb_context_optional: Editing mise.toml, task dependencies, or multi-step project workflows.
```

Reference-only global skill:

```yaml
skills:
  bash-scripting:
    location: global
    rationale: Useful for shell-heavy work, but kb should still prefer mise tasks over ad-hoc standalone scripts.
    policy:
      type: reference
      usage:
        summary: Shell-heavy hooks or embedded mise commands.
        when:
          load:
            - shell-heavy hooks
            - embedded mise script commands
          avoid:
            - replacing mise tasks with standalone scripts
```

Blocked skill:

```yaml
skills:
  stitch-loop:
    location: global
    rationale: Its autonomous website iteration workflow does not match kb's desktop app and gated implementation process.
    policy:
      type: blocked
      reason: incompatible_workflow
      avoid:
        - any kb implementation task
```

Blocked skill covered by project guides:

```yaml
skills:
  functional-core-imperative-shell:
    location: global
    rationale: kb already has FCIS as a project architecture rule, and the global skill's mandatory comments do not match current source conventions.
    policy:
      type: blocked
      reason: covered_by_project_guides
      redirect_to:
        - assets/guides/FCIS.guide.md
        - .agents/skills/kb-context/SKILL.md
      avoid:
        - direct adoption
        - mandatory comments that do not match kb conventions
```

## Electrobun routes to preserve

Preserve the existing Electrobun route semantics by moving/keeping these rows
under `skills.<skill-id>.policy.routing.electrobun`:

| Skill | Order | Triggers | Extra note |
| --- | ---: | --- | --- |
| `electrobun-plugin-guide` | 10 | `Unsure where to start`, `which electrobun skill`, `overview` |  |
| `electrobun-config` | 20 | `electrobun.config.ts`, `build.views`, `copy assets` |  |
| `electrobun-core` | 30 | `Main process`, `BrowserWindow`, `BrowserView`, `lifecycle`, `menus`, `tray` |  |
| `electrobun-rpc` | 40 | `Typed RPC`, `Electroview.defineRPC`, `schema bun/webview`, `rpc.client` | `native IPC transport only` |
| `electrobun-dev` | 50 | `electrobun dev`, `watch/hot`, `devtools`, `dev cycle` |  |
| `electrobun-build` | 60 | `electrobun build`, `CI`, `signing`, `distribution failures` |  |
| `electrobun-platform` | 70 | `Linux/Windows/macOS differences`, `CEF`, `multi-platform CI` |  |
| `electrobun-sdlc` | 80 | `End-to-end feature pipeline`, `multi-agent SDLC` |  |
| `electrobun-workflow` | 90 | `What stage next`, `lifecycle between dev/build/ship` |  |
| `electrobun-kitchen-sink` | 100 | `Kitchen sink`, `defineTest`, `upstream Electrobun test harness` |  |
| `electrobun-testing` | 110 | `Electrobun's own test framework patterns`, `defineTest` |  |
| `electrobun-webgpu` | 120 | `WebGPU`, `GpuWindow`, `WGSL` |  |
| `electrobun-milady` | 130 | `milady-ai/milady repo PRs`, `Electrobun conventions` |  |

For routes, do not store `note: project`, `note: owned`, or
`note: global only`. Generate that status from `location`:

- `location: project` -> `project`
- `location: owned` -> `owned`
- `location: global` -> `global only`

Append ` - <route.note>` only when a route has an extra note, such as
`native IPC transport only`.

## Validation updates

Move the validation logic into the single `skill` task in `mise.toml`.

Validate every skill entry:

- `location` is one of `owned`, `project`, or `global`.
- `rationale` is a non-empty string.
- `policy` is a mapping.
- `policy.type` is one of `required`, `routed`, `optional`, `reference`, or
  `blocked`.
- Old skill-level fields are forbidden: `source`, `install`, `link`,
  `decision`, `load`, and top-level `electrobun_routing`.
- `location: project` requires a matching entry in `skills-lock.json`.
- `location: owned` and `location: global` must not appear in
  `skills-lock.json`.
- Every `skills-lock.json` entry requires a matching `location: project`
  registry entry.

Validate policy shapes:

- `required` requires `policy.usage` and forbids `policy.routing`,
  `policy.surfaces`, `policy.reason`, and `policy.redirect_to`.
- `routed` requires `policy.usage` and non-empty `policy.routing`; it forbids
  `policy.surfaces`, `policy.reason`, and `policy.redirect_to`.
- `optional` requires `policy.usage`; it forbids `policy.routing`,
  `policy.reason`, and `policy.redirect_to`.
- `reference` requires `policy.usage`; it forbids `policy.routing`,
  `policy.surfaces`, `policy.reason`, and `policy.redirect_to`.
- `blocked` requires `policy.reason`; it forbids `policy.usage`,
  `policy.routing`, and `policy.surfaces`.
- `blocked` requires `location: global`.

Validate usage:

- `policy.usage.summary` is a non-empty string.
- `policy.usage.when.load` is a non-empty list of non-empty strings.
- `policy.usage.when.avoid` is a list of strings.

Validate routing:

- Only `policy.type: routed` may contain `policy.routing`.
- `policy.routing.electrobun` is a list when present.
- Each route has numeric `order`.
- Each route has non-empty `triggers`.
- Each trigger is a non-empty string.
- `note` is optional, but must be non-empty when present.
- Redundant notes are rejected: `project`, `owned`, and `global only`.

## Single task updates

Replace the current skill-related mise tasks with one public task:

```toml
[tasks.skill]
description = "Validate, generate, install, and report kb skill registry artifacts."
usage = '''
arg "<action>" help="Skill registry action" {
  choices "validate" "sync" "install" "all" "report"
}
flag "--json" help="Print machine-readable report output"
flag "--dry-run" help="Validate intended writes without changing files"
'''
run = '''
#!/usr/bin/env bun
// Implementation lives here.
'''
```

Use a positional `action` rather than multiple public task names:

| Command | Expected behavior |
| --- | --- |
| `mise run skill validate` | Validate `assets/guides/SKILLS.yml` only. |
| `mise run skill sync` | Validate, then rewrite generated snippets. |
| `mise run skill install` | Validate, then restore project skills from `skills-lock.json` through the Skills CLI. |
| `mise run skill all` | Validate, sync snippets, then restore project skills from `skills-lock.json`. |
| `mise run skill report` | Validate and print registry counts without writing files. |

The task must use mise `usage` variables from the usage field, for example
`${usage_action?}`, `${usage_json:-false}`, and `${usage_dry_run:-false}`. Do
not use deprecated Tera task-argument helpers such as `{{arg(...)}}`,
`{{option(...)}}`, or `{{flag(...)}}`.

After adding `skill`, remove the public `skills:validate`, `skills:sync`, and
`link:skills` implementations. If backwards compatibility is desired, add
hidden wrapper tasks that delegate to `mise run skill validate`,
`mise run skill sync`, and `mise run skill install`, but do not keep separate
copies of the implementation.

### `skill sync`

The `skill sync` action must:

- Use `skill.policy.usage.summary` wherever it previously used
  `skill.when.summary`.
- Generate optional companion snippets from skills where
  `policy.type === "optional"` and `policy.surfaces` is present.
- Use `policy.surfaces.claude_optional` for `CLAUDE.md`.
- Use `policy.surfaces.kb_context_optional` for
  `.agents/skills/kb-context/SKILL.md`.
- Generate `.cursor/electrobun-skill-routing.md` by scanning
  `skills.*.policy.routing.electrobun`.
- Sort Electrobun routes by `order`.
- Join route `triggers` with `, ` for the first table column.
- Derive the base route note from `location`.
- Append ` - <route.note>` only when a route-level extra note exists.

### `skill install`

The `skill install` action must:

- Validate the registry before installing.
- Run `skills experimental_install` from the repository root to restore
  `skills-lock.json` entries into `.agents/skills/`.
- Leave `location: owned` skills alone because those are real project-authored
  directories.
- Leave `location: global` skills alone because those stay in
  `$HOME/.agents/skills`.
- Treat `skills-lock.json` as the restorable project skill source of truth.

### `skill report`

The `skill report` action must:

- Validate the registry.
- Print schema version.
- Print total skill count.
- Print counts by `location`.
- Print counts by `policy.type`.
- Print the number of Electrobun route rows discovered from nested routing.
- When `--json` is provided, print the same report as JSON.

### `--dry-run`

The `--dry-run` flag must prevent file writes and Skills CLI installs for
`sync`, `install`, and `all`. It must still run validation and report what
would change in plain text unless `--json` is also set.

## Guide updates

Update `assets/guides/SKILLS.md`.

Make sure it says:

- `SKILLS.yml` keeps one canonical `skills:` entry per skill.
- `location` is the only install/materialization field.
- `location` uses `owned`, `project`, or `global` to align with the `skills`
  CLI project/global model while preserving project-authored skill ownership.
- `policy.type` is the only usage-policy discriminator.
- `policy.usage.summary`, `policy.usage.when.load`, and
  `policy.usage.when.avoid` define load guidance for usable skills.
- `policy.type: blocked` has no `usage`, `routing`, or `surfaces`.
- Route-level notes are only for extra context; `project`, `owned`, and
  `global only` are derived from `location`.
- The old skill-level fields `source`, `install`, `link`, `decision`, and
  `load` no longer exist.
- Skill registry automation is exposed through `mise run skill <action>`.

## Verification

Run and report these checks:

```bash
mise run skill validate
mise run skill sync
mise run skill install
mise run skill all --dry-run
mise run skill report
bun run lint:mise
```

Confirm that `mise run skill report` prints:

- schema version
- total skills
- count by `location`
- count by `policy.type`
- number of Electrobun route rows discovered from nested routing

Run a Skills CLI consistency check to confirm:

- every `location: project` entry is present in `skills-lock.json`
- every `skills-lock.json` entry is present as `location: project`
- no `location: owned` or `location: global` entry appears in
  `skills-lock.json`

Run:

```bash
git diff --check -- assets/guides/SKILLS.yml assets/guides/SKILLS.md mise.toml CLAUDE.md .agents/skills/kb-context/SKILL.md .cursor/electrobun-skill-routing.md assets/docs/specs/skills-normalisation/requirements.md assets/docs/specs/skills-normalisation/handoff.md
```

Search to confirm:

```bash
rg "(^    (source|install|link|decision|load):)|skill\\.(source|install|link|decision|load)\\b|electrobun_routing|registry\\.electrobun_routing|^\\s+trigger:" assets/guides/SKILLS.yml mise.toml assets/guides/SKILLS.md assets/docs/specs/skills-normalisation
```

Expected search result:

- No active skill-level schema fields named `source`, `install`, `link`,
  `decision`, or `load`.
- No top-level `electrobun_routing`.
- No old route `trigger:` fields.
- No separate public `skills:validate`, `skills:sync`, or `link:skills`
  implementations remain.
- Mentions of old field names are acceptable only in migration prose or
  validation error messages.

## Expected outcome

- `assets/guides/SKILLS.yml` has one canonical entry per skill.
- Every skill entry has `location`, `rationale`, and `policy.type`.
- No skill entry has contradictory source/install or policy state.
- Blocked policies cannot route or define usage.
- Routed policies must define routing.
- Project-installed skills are derived from `location: project` and
  `skills-lock.json`.
- `mise run skill <action>` is the single public entry point for skill registry
  validation, generation, install, and reporting.
- Generated routing tables remain semantically equivalent.
- `electrobun-rpc` still renders the extra
  `project - native IPC transport only` note.
```
