---
title: Code review graph guide
description: Install, use, monitor, and troubleshoot KB's code-review-graph setup
---
<!-- markdownlint-disable-file -->

# Code review graph

KB uses [code-review-graph](https://github.com/tirth8205/code-review-graph)
(CRG) as its local structural knowledge graph for source code. CRG parses
tracked code with Tree-sitter, stores graph data in ignored SQLite files under
`.code-review-graph/`, and exposes queries to coding agents over MCP.

CRG replaces Graphify for KB. The graph is local and reproducible: do not
commit `.code-review-graph/graph.db`.

## Why KB uses CRG

CRG gives agents a fast orientation layer before broad scans. It supports
caller and callee inspection, import analysis, impact-radius estimates, review
context, test discovery, and incremental updates after normal edits.

KB selected CRG because its code-focused graph, MCP server, local SQLite
storage, and incremental update model directly address Graphify rebuild
latency. KB does not maintain a parallel Graphify graph because two graph
stores would add duplicate instructions, competing update paths, and generated
artifact churn.

## References

- [CRG repository](https://github.com/tirth8205/code-review-graph)
- [CRG install guide](https://code-review-graph.com/install)
- [CRG PyPI package](https://pypi.org/project/code-review-graph/)

## Setup

The canonical setup command installs the Mise-managed `uv` version, installs
or upgrades CRG through `uv tool`, refreshes repo-scoped MCP files without
installing redundant hooks, and builds the local graph:

```sh
mise run graph setup
```

`mise run project setup` also runs this workflow after project dependency
setup. The underlying CRG installer command remains:

```sh
uv tool install --upgrade code-review-graph
```

Codex and Antigravity use user-level MCP config files. Update those local-only
files explicitly:

```sh
mise run graph setup --user-config
```

The opt-in command merges the Codex MCP entry, backs up Antigravity's config,
preserves unrelated Antigravity MCP entries, validates its JSON, and builds
the graph. If Antigravity JSON is malformed, the command stops after creating
a timestamped backup so the file can be repaired without losing existing
configuration.

After setup, restart MCP clients so they load their new server configuration.

## Agent coverage

Repo MCP configurations run `uvx code-review-graph serve` so teammates do not
depend on a machine-specific Python path.

| Agent          | MCP config                              | Scope | Committed |
| -------------- | --------------------------------------- | ----- | --------- |
| Codex          | `~/.codex/config.toml`                  | user  | no        |
| Claude Code    | `.mcp.json`                             | repo  | yes       |
| Cursor         | `.cursor/mcp.json`                      | repo  | yes       |
| OpenCode       | `.opencode.json`                        | repo  | yes       |
| Antigravity    | `~/.gemini/antigravity/mcp_config.json` | user  | no        |
| Gemini CLI     | `.gemini/settings.json`                 | repo  | yes       |
| GitHub Copilot | `.vscode/mcp.json`                      | repo  | yes       |

Agent instructions live in `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`,
`.cursor/rules/code-review-graph.mdc`, and
`.github/instructions/code-review-graph.instructions.md`.

## Query workflow

Agents should use CRG MCP tools before broad codebase scans:

1. Start with graph statistics or minimal context.
2. Query callers, callees, imports, tests, impact radius, or review context.
3. Read the relevant files directly before making a code decision.
4. Fall back to `rg` and direct reads when graph coverage is insufficient.
5. Run `mise run graph update` when the graph appears stale.

## Activation paths

CRG is active through these paths:

| Activation path            | Purpose                                                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `mise run graph setup`     | Installs or upgrades CRG, refreshes repo MCP files without hooks, and builds the local graph.                            |
| `code-review-graph daemon` | Preferred shared file watcher for incremental refresh across agents.                                                     |
| `mise run graph watch`     | Direct watcher command for a supervisor when the detached daemon is unhealthy.                                           |
| `post-commit` HK step      | Dev-only: schedules non-blocking background `update --skip-flows` + `detect-changes --brief` (skipped when `CI` is set). |
| Repo MCP files             | Expose `uvx code-review-graph serve` to Claude Code, Cursor, OpenCode, Gemini CLI, and GitHub Copilot.                   |
| User MCP files             | Expose CRG to Codex and Antigravity after explicit local setup.                                                          |

HK remains the only Git hook owner. Do not append CRG commands directly to
`.git/hooks/pre-commit`, and do not add redundant per-agent edit hooks.

## Common commands

```sh
# Install or upgrade the CLI only
mise run graph install

# Install or upgrade, configure repo MCP files, and rebuild the graph
mise run graph setup

# Also merge local-only Codex and Antigravity MCP config
mise run graph setup --user-config

# Rebuild or incrementally refresh graph data
mise run graph build
mise run graph update

# Inspect graph health
mise run graph status
git status --short --ignored .code-review-graph

# Run a direct watcher under a supervisor
mise run graph watch

# Inspect the preferred multi-repo daemon
code-review-graph daemon status
code-review-graph daemon logs

# Verify MCP startup directly, then stop with Ctrl-C
uvx code-review-graph serve
```

## Watcher setup

Register KB with CRG's preferred multi-repo daemon:

```sh
code-review-graph daemon add "$PWD" --alias kb
code-review-graph daemon start
code-review-graph daemon status
```

CRG 2.3.5 can report a detached daemon parent as running while its KB watcher
child is dead. Until upstream fixes detached watcher health, stop the broken
daemon and supervise one direct watcher:

```sh
code-review-graph daemon stop
mise run graph watch
```

On macOS, use a user-level LaunchAgent at
`~/Library/LaunchAgents/ai.code-review-graph.kb-watch.plist` with these
`ProgramArguments`:

```txt
/Users/roalcantara/.local/bin/code-review-graph
watch
--repo
/Users/roalcantara/Work/bun/kb
```

Activate and inspect it:

```sh
launchctl bootstrap "gui/$(id -u)" \
  ~/Library/LaunchAgents/ai.code-review-graph.kb-watch.plist
launchctl print "gui/$(id -u)/ai.code-review-graph.kb-watch"
```

## Ignore policy

`.gitignore` excludes `.code-review-graph/`, and CRG adds an inner `.gitignore`
as a second guard. `.code-review-graphignore` excludes dependencies, generated
output, reports, runtime state, and non-code assets that do not belong in the
graph.

Update `.code-review-graphignore` when new generated or non-code asset trees
are added. Preserve quality-tool strictness when updating generated-path
exclusions.

## Best practices

- Keep `.code-review-graph/` local and ignored.
- Use MCP graph queries before broad scans, then confirm critical details by
  reading the relevant files directly.
- Use incremental updates during normal work. Reserve `mise run graph build`
  for initial setup, stale graphs, major refactors, and branch changes.
- Keep the daemon, or one supervised direct watcher, as the single shared
  edit-triggered freshness mechanism.
- Preserve HK as the only Git hook owner.
- Use `--no-hooks --no-instructions --no-skills` when running CRG platform
  installers manually so repo policy remains authoritative.

## Troubleshooting

### Graph is stale or missing

```sh
rm -rf .code-review-graph
mise run graph build
mise run graph status
```

### Detached watcher is dead

```sh
code-review-graph daemon status
code-review-graph daemon stop
mise run graph watch
```

Use the LaunchAgent fallback above when the watcher must remain supervised
after the shell exits.

### MCP client cannot start CRG

```sh
uvx code-review-graph serve
mise run graph status
```

Confirm `uvx` is on the MCP client's `PATH`, then restart the client after
config changes.

### Antigravity config is malformed

`mise run graph setup --user-config` creates a timestamped backup before
validating Antigravity JSON. Repair
`~/.gemini/antigravity/mcp_config.json`, preserve existing `mcpServers`, then
retry the setup command.

### HK reports a CRG problem

HK's CRG update and risk summary are informational. Inspect graph health with:

```sh
mise run graph status
mise run graph update
```

The project quality gate remains:

```sh
bash .agents/skills/app-quality-gate/scripts/gate.sh
```
