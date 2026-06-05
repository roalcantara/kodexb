---
title: Project Skill Guide
description: How the project classifies agent skills and how the project keeps that classification consistent.
---
<!-- markdownlint-disable-file -->

This guide explains how the project classifies agent skills and how the
project keeps that classification consistent. The structured source of truth
is [`SKILLS.yaml`](../catalog/SKILLS.yaml) in `assets/catalog/`; this
Markdown file is the human-facing explanation of the same policy.

Run `mise run skill validate` after editing `SKILLS.yaml`. Run
`mise run skill sync` to refresh generated snippets in `CLAUDE.md`,
`.agents/skills/app-context/SKILL.md`, and
`.cursor/electrobun-skill-routing.md`. Run `mise run skill install` to restore
project-managed external skills from `skills-lock.json` through the Skills CLI.

## Schema

`SKILLS.yaml` keeps one `skills:` entry per relevant skill. Each entry has a
single `location`, a `rationale`, and one discriminated `policy.type`.

| Field               | Meaning                                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `location: owned`   | Project-authored skill committed under `.agents/skills/<skill-id>`. These skills are not managed by `skills-lock.json`.  |
| `location: project` | External skill managed by the Skills CLI, recorded in `skills-lock.json`, and restored into `.agents/skills/<skill-id>`. |
| `location: global`  | Global-only companion used from `$HOME/.agents/skills/<skill-id>` when available.                                        |

| Policy type | Meaning                                                                                         |
| ----------- | ----------------------------------------------------------------------------------------------- |
| `required`  | Standing project skill for its domain.                                                          |
| `routed`    | Skill selected by generated routing tables, such as Electrobun routing.                         |
| `optional`  | Companion skill loaded for specific situations when it does not conflict with project guidance. |
| `reference` | Upstream reference only; useful for reading, not project routing.                               |
| `blocked`   | Do not use directly in this project. Redirect to the listed project guide when present.         |

Usable policies define `policy.usage.summary`,
`policy.usage.when.load`, and `policy.usage.when.avoid`. Blocked policies do
not define `usage`; they define `policy.reason` and may define
`policy.redirect_to`.

The schema intentionally has no skill-level `source`, `install`, `link`,
`decision`, or `load` fields. `location` prevents source/install
contradictions, and `policy.type` prevents blocked/routed/optional state
contradictions.

## Consistency

The registry and lock file must agree:

- Every `location: project` entry must appear in `skills-lock.json`.
- Every `skills-lock.json` entry must appear in `SKILLS.yaml` as
  `location: project`.
- `location: owned` and `location: global` entries must not appear in
  `skills-lock.json`.
- The Skills CLI owns how project skills are materialized under
  `.agents/skills/`; the project does not model copy versus symlink in `SKILLS.yaml`.

## Decision Rules

Apply these rules before adopting or invoking a skill:

1. Project-specific instructions win over generic skill advice.
2. `CLAUDE.md`, `AGENTS.md`, and `.agents/skills/app-context/SKILL.md` define
   the standing workflow.
3. `assets/guides/` define the project style, testing, runtime, and quality
   expectations.
4. Electrobun work must use `.cursor/electrobun-skill-routing.md` before
   choosing a narrower Electrobun skill.
5. Generic skills may be used as optional companions only when they do not
   weaken the quality gate, FCIS boundaries, TypeBox-only RPC model, or
   prototype approval gate.

Do not add a skill to the project only because it sounds useful. Add project
routing only when the skill changes agent behavior in a repeatable
project-specific situation.

## Current Project Skills

| Skill                          | Location  | Policy      | Rationale                                                                      |
| ------------------------------ | --------- | ----------- | ------------------------------------------------------------------------------ |
| `app-context`                  | `owned`   | `required`  | Mandatory project orientation and guide routing.                               |
| `app-rpc`                      | `owned`   | `required`  | Canonical app-level Elysia, Eden Treaty, and TypeBox RPC guidance.             |
| `app-testing`                  | `owned`   | `required`  | Canonical testing workflow for co-located Bun specs and harnesses.             |
| `app-quality-gate`             | `owned`   | `required`  | Executable completion and commit-readiness gate.                               |
| `app-logging`                  | `owned`   | `required`  | Structured logging with LogTape, `LOG_LEVEL` dial, and DB/RPC instrumentation. |
| `build-graph`                  | `project` | `required`  | Operational CRG MCP workflow for graph initialization and refresh.             |
| `code-review-graph`            | `project` | `reference` | CRG concepts, subordinate to upstream CLI docs and KB graph policy.            |
| `electrobun-best-practices`    | `project` | `required`  | Baseline for desktop stack work before narrower Electrobun skills.             |
| `electrobun-plugin-guide`      | `project` | `routed`    | Entry point when the right Electrobun skill is unclear.                        |
| `electrobun-config`            | `project` | `routed`    | Electrobun configuration, build views, and asset wiring.                       |
| `electrobun-core`              | `project` | `routed`    | Main process, windows, views, and lifecycle behavior.                          |
| `electrobun-window-management` | `project` | `required`  | Multi-window and BrowserView orchestration.                                    |
| `electrobun-native-ui`         | `project` | `required`  | Menus, dialogs, tray, shortcuts, and clipboard behavior.                       |
| `electrobun-rpc`               | `project` | `routed`    | Native Electrobun IPC only; app-level RPC remains `app-rpc`.                   |
| `electrobun-dev`               | `project` | `routed`    | Electrobun dev server, hot reload, and devtools workflow.                      |
| `electrobun-build`             | `project` | `routed`    | Electrobun build pipeline and CI build behavior.                               |
| `electrobun-platform`          | `project` | `routed`    | macOS, Windows, Linux, CEF, and platform differences.                          |
| `electrobun-distribution`      | `project` | `required`  | Packaging, signing, notarization, and distribution artifacts.                  |
| `electrobun-sdlc`              | `project` | `routed`    | Electrobun feature lifecycle guidance, subordinate to project specs and gate.  |
| `electrobun-workflow`          | `project` | `routed`    | Electrobun dev/build/ship workflow questions.                                  |
| `electrobun-kitchen-sink`      | `project` | `routed`    | Upstream examples and `defineTest` reference, adapted to project rules.        |
| `electrobun-testing`           | `project` | `routed`    | Electrobun-specific test framework patterns, with `app-testing` as authority.  |
| `electrobun-webgpu`            | `project` | `routed`    | WebGPU, `GpuWindow`, and WGSL work only.                                       |
| `electrobun-milady`            | `project` | `routed`    | Upstream milady repository conventions.                                        |
| `electrobun`                   | `project` | `reference` | Broad upstream Electrobun overview.                                            |
| `electrobun-rpc-patterns`      | `project` | `optional`  | Advanced native IPC patterns after the base RPC boundary is understood.        |
| `bun-development`              | `project` | `optional`  | Bun implementation details alongside the project Bun guide.                    |
| `bun-runtime`                  | `project` | `optional`  | Bun runtime, package manager, and test-runner behavior.                        |

## Optional Companion Matrix

| Situation                                          | Optional companion skills                                                                  |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Failing tests, regressions, unclear behavior       | `systematic-debugging`                                                                     |
| Structural search or repository rules              | `ast-grep`                                                                                 |
| Elysia route mechanics under project RPC           | `elysia`, after `app-rpc`                                                                  |
| Unused exports, files, or dependencies             | `knip`                                                                                     |
| Duplication findings and extraction judgment       | `jscpd`, `dry-principle`                                                                   |
| FCIS placement or purity questions                 | `FCIS.guide.md`, `app-context`; do not use raw `functional-core-imperative-shell` comments |
| `mise.toml`, task wiring, tool versions            | `mise-tasks`, `mise-expert`                                                                |
| Review preparation or review feedback              | `requesting-code-review`, `receiving-code-review`                                          |
| Design or prototype intake                         | `stitch-design`, only under the prototype gate                                             |
| React component translation from a design artifact | `react:components`, adapted to the project's renderer and guide stack                      |
| Isolated parallel development                      | `using-git-worktrees`, only when requested or approved                                     |
| Final verification reminder                        | `verification-before-completion`; `app-quality-gate` remains executable authority          |
| Running Electrobun app inspection                  | `agent-electrobun`, never as a replacement for tests or gates                              |

## Reference-Only Skills

Reference-only skills are useful for reading when the situation explicitly
calls for them, but they are not project routing defaults:

- `bash-scripting`
- `bdd-gherkin-specification`
- `bdd-patterns`
- `bdd-principles`
- `bdd-scenarios`
- `elysiajs`
- `formatter-development`
- `playwright-bdd-gherkin-syntax`
- `quality-assurance`

## Blocked Skills

Blocked skills must not be used directly in this project:

| Skill                              | Reason                                                                                                           | Use instead                                                          |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `domain-name-brainstormer`         | Product naming and domain brainstorming are unrelated to this repo's workflow.                                   | No replacement.                                                      |
| `functional-core-imperative-shell` | The project already defines FCIS, and the global skill's mandatory comments do not match source conventions.     | `assets/guides/FCIS.guide.md`, `.agents/skills/app-context/SKILL.md` |
| `stitch-loop`                      | Its autonomous website iteration loop does not match the project's desktop app and gated implementation process. | `stitch-design` only under the prototype gate.                       |

## Updating Skills

Do **not** run raw `skills add` without updating this registry. Use the Mise
workflows below.

| Goal                       | Command                                                                   |
| -------------------------- | ------------------------------------------------------------------------- |
| Browse registry            | `mise run skill list` or `mise run skill report --list-skills`            |
| Add upstream/project skill | `mise run skill add <url> --type <optional\|reference\|required\|routed>` |
| Create owned skill         | `mise run skill create <id> [--type required\|optional]`                  |
| Fix lock ↔ YAML drift      | `mise run skill reconcile` (dry-run first with `--dry-run`)               |
| Remove orphan installs     | `mise run skill prune`                                                    |
| Fresh clone restore        | `mise run skill install`                                                  |
| Health check               | `mise run skill validate`                                                 |

Decision tree:

```txt
Project-specific authored content?     → skill create (owned)
Upstream / shared skill from registry? → skill add (project)
Lock changed without YAML?             → skill reconcile
Fresh clone?                           → skill install
Validate red after drift?              → reconcile → curate → prune → validate
```

The **Current Project Skills** table below is narrative documentation.
`mise run skill list` is the live catalog sourced from `SKILLS.yaml`.

After policy edits:

1. Edit `assets/catalog/SKILLS.yaml` (or use `skill add` / `skill create` /
   `skill reconcile`).
2. Run `mise run skill validate`.
3. Run `mise run skill sync` when generated snippets must change.
4. Run `mise run skill install` when project-managed external skills must be
   restored from `skills-lock.json`.
5. Review `assets/guides/SKILLS.md`, `CLAUDE.md`,
   `.agents/skills/app-context/SKILL.md`, and
   `.cursor/electrobun-skill-routing.md` together when the change affects
   routing or optional companion guidance.

### Global vs project inventory

- **`location: owned`** — project-authored under `.agents/skills/`; never in
  `skills-lock.json`.
- **`location: project`** — Skills CLI managed; must appear in
  `skills-lock.json` and `.agents/skills/` after `skill install`.
- **`location: global`** — optional companions in `$HOME/.agents/skills/`;
  registry-only in YAML; must **not** appear in `skills-lock.json`.
