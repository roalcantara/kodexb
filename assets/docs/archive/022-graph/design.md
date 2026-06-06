<!-- markdownlint-disable-file -->
# Code review graph migration - Design

## Overview

KB will replace Graphify with CRG as its only code knowledge graph. Graphify's
installed CLI and committed multi-file output are removed. CRG's SQLite graph
remains local, ignored, and reproducible through a full build.

The migration uses three layers:

1. **Portable repo contract:** ignores, MCP configs, agent guidance, skill
   classification, HK integration, maintainer CRG guide, root README link, and
   this spec.
2. **Local activation:** install the CRG CLI, repair and configure user-level
   MCP files, register KB with the CRG daemon, and start the watcher.
3. **Generated local graph:** `.code-review-graph/graph.db`, created by CRG and
   never committed.

## Decision rationale

### Option 1: CRG only - selected

CRG is code-focused, Tree-sitter based, SQLite backed, MCP native, and
incrementally updated. It directly addresses KB's need for fast code
orientation and blast-radius queries without committing generated graph data.

### Option 2: Graphify plus CRG - rejected

The tools can complement each other, but KB would need to maintain two graph
stores, two query paths, duplicate instructions, and competing update
triggers. Graphify's multimodal corpus support is not a current KB
requirement.

### Option 3: Graphify only - rejected

Keeping Graphify would minimize migration work but preserve the rebuild-latency
problem and committed graph churn.

## Architecture

```txt
tracked KB code
      |
      v
CRG daemon watcher ----------------------------+
      |                                        |
      | incremental update                     | full rebuild on demand
      v                                        v
.code-review-graph/graph.db <--------- code-review-graph build
      |
      +--> uvx code-review-graph serve
      |       |
      |       +--> Codex MCP
      |       +--> Claude Code MCP
      |       +--> Cursor MCP
      |       +--> OpenCode MCP
      |       +--> Antigravity MCP
      |       +--> Gemini CLI MCP
      |       +--> GitHub Copilot MCP
      |
      +--> HK pre-commit optional risk summary
```

## Hook ownership

HK remains the only Git hook installer and owner. Its installed pre-commit
hook begins with:

```sh
exec mise x -- hk run pre-commit --from-hook "$@"
```

Appending the upstream CRG hook after that `exec` would make the CRG commands
unreachable. The implementation must run CRG from `hk.pkl` instead:

```sh
if command -v code-review-graph >/dev/null 2>&1; then
  code-review-graph update --skip-flows || true
  code-review-graph detect-changes --brief || true
fi
```

This step is informational. It must not weaken or replace HK hygiene,
commit-message validation, the pre-push quality gate, or `gate.sh`.

The daemon is the preferred shared edit-triggered freshness path. Do not
install redundant per-agent edit hooks that launch extra CRG updates after
every edit. Agent session hooks may report status, but they must not compete
with the shared watcher.

CRG 2.3.5 has an upstream detached-daemon defect on the migration workstation:
`daemon_cli.py` calls `daemon.start()` before `daemon.daemonize()`, so its
health and config-watcher threads are created before the double fork and do not
survive in the detached parent. If `code-review-graph daemon status` reports a
dead KB child after startup, stop the broken daemon and run one direct
`code-review-graph watch --repo /Users/roalcantara/Work/bun/kb` process under a
local supervisor as the shared fallback until upstream fixes detached watcher
health. On macOS, use a user-level LaunchAgent rather than an unsupervised
background shell process.

## Graph data and ignore policy

CRG writes local runtime data under `.code-review-graph/`. The repository
ignores the directory, and CRG adds an inner `.gitignore` with `*` as a second
guard. The database contains local absolute paths and code metadata, so it is
not a portable artifact.

Create `.code-review-graphignore` with:

```gitignore
.code-review-graph/**
.agents/skills/**
.claude/skills/**
.opencode/node_modules/**
node_modules/**
build/**
dist/**
out/**
tmp/**
coverage/**
report/**
test-results/**
playwright-report/**
e2e/.generated/**
assets/images/**
assets/sources/**
*.map
*.log
*.lock
```

CRG uses `git ls-files` in Git repositories, so this file primarily excludes
tracked dependency snapshots, generated content, and non-code assets.

Quality tools that can traverse ignored local directories should replace
`graphify-out` exclusions with `.code-review-graph` exclusions. This is a
generated-path migration, not a quality-rule relaxation.

## Agent configuration matrix

The portable MCP server command is:

```json
{
  "command": "uvx",
  "args": ["code-review-graph", "serve"],
  "type": "stdio",
  "cwd": "/Users/roalcantara/Work/bun/kb"
}
```

Use the schema required by each client. Repository-scoped files may use the
absolute KB `cwd` because this repository is configured for the current
workspace. User-level files remain local-only.

| Agent | MCP config | Scope | Committed | Hook/update strategy |
| --- | --- | --- | --- | --- |
| Codex | `~/.codex/config.toml` | user | no | CRG daemon; document local MCP setup |
| Claude Code | `.mcp.json` | repo | yes | CRG daemon; add guidance to `CLAUDE.md` |
| Cursor | `.cursor/mcp.json` | repo | yes | CRG daemon; preserve `.cursor/hooks.json` Electrobun hook |
| OpenCode | `.opencode.json` | repo | yes | CRG daemon; remove Graphify plugin; use `AGENTS.md` |
| Antigravity | `~/.gemini/antigravity/mcp_config.json` | user | no | back up malformed JSON, repair, validate, then add MCP |
| Gemini CLI | `.gemini/settings.json` | repo | yes | CRG daemon; add `GEMINI.md` guidance |
| GitHub Copilot | `.vscode/mcp.json` | repo | yes | CRG daemon; add `.github/instructions/code-review-graph.instructions.md` |

`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, Cursor guidance, and Copilot
instructions should share a concise policy:

1. Use CRG MCP tools before broad file scans for codebase exploration.
2. Start with graph stats or minimal context.
3. Use impact-radius and review-context tools for code review.
4. Fall back to `rg` and direct reads when graph coverage is insufficient.
5. Run `code-review-graph update --skip-flows` if the graph appears stale.

## Skill classification

The user has already downloaded:

- `build-graph` from `tirth8205/code-review-graph`
- `code-review-graph` from `aradotso/trending-skills`

Both belong in `assets/catalog/SKILLS.yaml` as `location: project` because
`skills-lock.json` records them. Their policies differ:

- `build-graph`: required operational workflow for CRG initialization and
  refresh through MCP.
- `code-review-graph`: reference companion for CRG concepts. Current upstream
  CLI docs remain authoritative when the summary drifts.

## Graphify removal map

Delete:

- `graphify-out/`
- `.opencode/plugins/graphify.js`

Update:

- `.gitignore`
- `.dockerignore`
- `.jscpd.json`
- `.dependency-cruiser.cjs`
- `.ls-lint.yml`
- `biome.jsonc`
- `hk.pkl`
- `package.json`
- `.opencode/opencode.json` or delete it if no OpenCode project plugin remains

`package.json` scans `src tools` explicitly for ast-grep, so its obsolete
`graphify-out` glob should be removed without adding an ineffective CRG
replacement glob.

Uninstall the current Graphify CLI after repo migration files have been
prepared:

```sh
uv tool uninstall graphifyy
command -v graphify || true
```

If `command -v graphify` still reports a path, inspect the residual executable
before deleting it. The current machine has reported `/opt/homebrew/bin/graphify`
as the resolved path, so the implementation must confirm whether that file is
still owned by uv, Homebrew, pipx, or another installer before removal.
The confirmed residual installation on this machine was owned by Homebrew
Python `pip`, which requires an explicit `--break-system-packages` uninstall
override under PEP 668.

## Installation sequence

1. Capture baseline and preserve unrelated user edits.
2. Adopt the downloaded skills in the project registry.
3. Delete Graphify output and integration.
4. Uninstall the Graphify CLI and verify that no residual `graphify` command
   remains.
5. Add CRG ignores and replace generated-directory exclusions.
6. Add a `mise run graph ...` workflow, pin `uv` in `mise.toml`, and install
   CRG through `uv tool install --upgrade code-review-graph`.
7. Run targeted CRG platform setup for the seven requested agents with
   `--no-hooks` so HK and the daemon remain authoritative.
8. Repair Antigravity's malformed local JSON after making a backup.
9. Add concise portable repo instructions and MCP config.
10. Register KB with the CRG daemon and start it.
11. Run `code-review-graph build`, status, and incremental-update verification.
12. Run skill validation, HK validation, the full quality gate, and stale
    Graphify-reference searches.
13. Stage and create one migration commit.

## Maintainer guidance

Add a brief root `README.md` section that links to `assets/guides/CRG.md`.
Keep the full maintainer guide in `assets/guides/CRG.md`, explaining:

1. Why KB uses CRG and how the local SQLite graph benefits agent work.
2. How to install, build, update, query, monitor, and troubleshoot CRG.
3. Which upstream references are authoritative.
4. Every activation path: the CRG daemon watcher, the optional HK pre-commit
   update and risk summary, and each MCP client configuration.
5. Best practices: keep generated graph data local, query MCP before broad
   scans, use incremental updates normally, reserve full rebuilds for stale
   state or major branch changes, and preserve HK as Git hook owner.
6. How `mise run graph setup` automates repo-safe setup and how
   `mise run graph setup --user-config` opts into local-only Codex and
   Antigravity configuration.

## Error handling

- If `uv tool install code-review-graph` fails, stop and record the exact uv
  error. Do not switch package managers without maintainer approval.
- If a user-level config is malformed, copy it to a timestamped backup before
  editing. Validate repaired JSON before installing CRG entries.
- If a repo-level MCP file exists, merge the CRG server entry instead of
  replacing unrelated entries.
- If the CRG daemon is already registered or running, treat the operation as
  idempotent and verify status.
- If CRG 2.3.5 reports a dead detached watcher, stop the daemon and use one
  supervised direct `code-review-graph watch --repo
  /Users/roalcantara/Work/bun/kb` process. Do not add redundant agent-specific
  hooks as a workaround.
- If `code-review-graph build` fails, retain `.code-review-graph/` for
  diagnosis but do not stage it.
- If removal of Graphify exclusions causes a quality tool to scan the local
  CRG database, add the narrow `.code-review-graph` exclusion rather than
  weakening the tool.

## Testing strategy

This migration changes development tooling, not application behavior. No new
Gherkin scenario is required.

Verification layers:

1. **Static migration checks:** no tracked Graphify output, no active stale
   Graphify references, required CRG ignore/config files present.
2. **Skill checks:** `mise run skill validate` and generated-routing review.
3. **CRG checks:** install, build, status, update, daemon status, MCP server
   startup.
4. **Hook checks:** HK config validation, installed HK pre-commit ownership,
   and an optional CRG risk-summary step visible in the HK plan.
5. **Repo gate:** `git diff --check` and
   `bash .agents/skills/app-quality-gate/scripts/gate.sh`.

The migration workstation has inherited lock/registry debt that makes
`mise run skill validate` red on detached `HEAD` before this migration. Record
that baseline failure, ensure the two CRG entries add no new validator
violations, and revert unrelated partial routing rewrites if `skill sync`
stops at its validation preflight.
