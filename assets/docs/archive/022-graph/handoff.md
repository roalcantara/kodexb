<!-- markdownlint-disable-file -->
# Code review graph migration - Handoff

## Goal

Replace KB's committed Graphify setup with a local SQLite-backed
code-review-graph setup, configure the requested agents, preserve HK hook
ownership, build the graph, verify the daemon, and create one final commit.

## Required reading

1. `AGENTS.md`
2. `.agents/skills/app-context/SKILL.md`
3. `.agents/skills/build-graph/SKILL.md`
4. `.agents/skills/code-review-graph/SKILL.md`
5. `assets/docs/archive/graph/requirements.md`
6. `assets/docs/archive/graph/design.md`
7. `assets/docs/archive/graph/tasks.md`
8. `.agents/skills/app-quality-gate/SKILL.md`

## Non-negotiable constraints

- Remove Graphify from KB completely. Do not keep it as fallback.
- Uninstall the Graphify CLI and verify that `command -v graphify` prints no
  path.
- Do not commit `.code-review-graph/graph.db`.
- Keep HK as the Git hook owner.
- Do not append CRG commands directly after HK's `exec` pre-commit hook.
- Use the CRG daemon as the shared edit-triggered freshness mechanism.
- Do not install redundant agent edit hooks that launch competing updates.
- Do not weaken quality-tool config to make migration validation pass.
- Preserve unrelated user changes, including the downloaded-skill lock edits.
- Run the full quality gate before the single final commit.

## Repo-scoped activation files

Commit:

- `.code-review-graphignore`
- `.mcp.json`
- `.cursor/mcp.json`
- `.opencode.json`
- `.gemini/settings.json`
- `.vscode/mcp.json`
- `.github/instructions/code-review-graph.instructions.md`
- CRG usage guidance in `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, and Cursor rules
- CRG skill classifications in `assets/catalog/SKILLS.yaml` and
  `assets/guides/SKILLS.md`
- Brief CRG overview and guide link in `README.md`
- Maintainer usage, hook, monitoring, best-practice, and troubleshooting
  guidance in `assets/guides/CRG.md`
- Mise-managed `uv` pin and `mise run graph ...` automation in `mise.toml`

Delete:

- `graphify-out/`
- `.opencode/plugins/graphify.js`
- `.opencode/opencode.json` if it becomes unused after plugin removal

## Local-only activation

Use the canonical repo-safe setup:

```sh
mise run graph setup
```

Opt into user-level Codex and Antigravity MCP changes explicitly:

```sh
mise run graph setup --user-config
```

The workflow pins `uv` through Mise and wraps:

```sh
uv tool install --upgrade code-review-graph
```

For watcher registration and status, run:

```sh
code-review-graph daemon add /Users/roalcantara/Work/bun/kb --alias kb
code-review-graph daemon start
code-review-graph daemon status
```

CRG 2.3.5 has an upstream detached-daemon defect on the migration workstation:
its detached parent loses the pre-fork health and config-watcher threads. If
`code-review-graph daemon status` reports the `kb` child as `dead`, stop that
daemon and start one supervised direct shared watcher. On macOS, install a
user-level LaunchAgent at
`~/Library/LaunchAgents/ai.code-review-graph.kb-watch.plist` with
`ProgramArguments` set to:

```txt
/Users/roalcantara/.local/bin/code-review-graph
watch
--repo
/Users/roalcantara/Work/bun/kb
```

Then activate and inspect it:

```sh
code-review-graph daemon stop
launchctl bootstrap "gui/$(id -u)" \
  ~/Library/LaunchAgents/ai.code-review-graph.kb-watch.plist
launchctl print "gui/$(id -u)/ai.code-review-graph.kb-watch"
```

Remove Graphify before installing CRG:

```sh
uv tool uninstall graphifyy
command -v graphify || true
```

If a residual Graphify path remains, inspect its installation owner before
deleting the executable.

On the migration workstation, the residual `/opt/homebrew/bin/graphify`
wrapper was owned by Homebrew Python `pip`. Its confirmed uninstall command
was:

```sh
/opt/homebrew/opt/python@3.14/bin/python3.14 -m pip uninstall \
  -y --break-system-packages graphifyy
```

Antigravity currently has malformed JSON at:

```txt
~/.gemini/antigravity/mcp_config.json
```

Before editing it:

```sh
cp ~/.gemini/antigravity/mcp_config.json \
  ~/.gemini/antigravity/mcp_config.json.bak.$(date +%Y%m%d%H%M%S)
```

Repair JSON without discarding unrelated entries, then validate:

```sh
jq empty ~/.gemini/antigravity/mcp_config.json
```

The upstream Antigravity installer still rejected the repaired file because
its existing client-specific MCP entries do not match the installer's parser.
Add the `code-review-graph` entry manually under `mcpServers`, preserve the
existing entries, and validate with `jq empty`.

## Required validation commands

```sh
git ls-files graphify-out
rg -n "graphify|Graphify|graphify-out|GRAPH_REPORT" . \
  --glob '!assets/docs/archive/graph/**' \
  --glob '!assets/guides/CRG.md' \
  --glob '!report/**' \
  --glob '!node_modules/**' \
  --glob '!.opencode/node_modules/**'
git status --short --ignored .code-review-graph
code-review-graph status
code-review-graph daemon status
mise run graph status
mise run graph update
mise run skill validate
mise exec -- hk validate
mise exec -- hk check --all --check --plan --json
git diff --check
bash .agents/skills/app-quality-gate/scripts/gate.sh
```

`mise run skill validate` is red on detached pre-migration `HEAD` because of
inherited lock/registry debt outside this scope. Confirm that its output adds
no `build-graph` or `code-review-graph` violation. `mise run skill sync` stops
at the same validation preflight; revert unrelated partial routing-table
rewrites if it modifies generated files before exiting.

## Completion contract

Complete every item in `tasks.md` in order. Add an `Evidence:` bullet with
changed files and exact commands to each checked task. Stage only intentional
repo changes and create one HK-valid migration commit.
