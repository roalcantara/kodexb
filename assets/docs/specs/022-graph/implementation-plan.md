<!-- markdownlint-disable-file -->
# Code review graph migration implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `subagent-driven-development` (recommended) or `executing-plans` to implement
> this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace KB's committed Graphify integration with a local,
incrementally updated code-review-graph setup shared by the project's common
agents.

**Architecture:** Keep CRG runtime data in ignored local SQLite storage, expose
it through portable repo MCP configs, and use the CRG daemon as the shared
freshness mechanism. Preserve HK as the Git hook owner and add one optional,
non-blocking HK pre-commit CRG update and risk-summary step.

**Tech Stack:** `code-review-graph`, `uv`, SQLite, MCP stdio, HK, Mise, JSON,
TOML, Markdown.

> **Status:** Migration completed (`chore(graph): Migrate to CRG`). Use
> [`tasks.md`](tasks.md) for checked tasks and `Evidence:` bullets. This plan
> is a historical outline; do not treat unchecked boxes below as pending work.

---

## File map

Create:

- `.code-review-graphignore`
- `.mcp.json`
- `.cursor/mcp.json`
- `.opencode.json`
- `.gemini/settings.json`
- `.vscode/mcp.json`
- `.github/instructions/code-review-graph.instructions.md`
- `.cursor/rules/code-review-graph.mdc`
- `GEMINI.md`
- `assets/guides/CRG.md`

Modify:

- `.gitignore`, `.dockerignore`, `.jscpd.json`, `.dependency-cruiser.cjs`
- `.ls-lint.yml`, `biome.jsonc`, `hk.pkl`, `package.json`
- `AGENTS.md`, `CLAUDE.md`, `README.md`, `mise.toml`
- `assets/docs/specs/README.md`
- `assets/catalog/SKILLS.yaml`, `assets/guides/SKILLS.md`
- `assets/docs/specs/graph/tasks.md`, `assets/docs/specs/graph/handoff.md`

Delete:

- `graphify-out/`
- `.opencode/plugins/graphify.js`
- `.opencode/opencode.json`

Local-only mutations:

- Uninstall `graphifyy`; install `code-review-graph`
- Merge KB CRG MCP entries into `~/.codex/config.toml`
- Back up, repair, and merge KB CRG MCP into
  `~/.gemini/antigravity/mcp_config.json`
- Register and start the CRG daemon watcher
- Build ignored `.code-review-graph/graph.db`

## Task 1: Capture the baseline

- [ ] Run `git status --short`.
- [ ] Run `git ls-files graphify-out .opencode/plugins/graphify.js .opencode/opencode.json`.
- [ ] Search active Graphify references with the command in `tasks.md` 0.1.
- [ ] Record `code-review-graph --version`, installer dry-run output, and
  `.git/hooks/pre-commit`.

Expected: only the downloaded-skill lock edit and graph SDD files are dirty;
the existing Git pre-commit hook remains HK-owned.

## Task 2: Register the downloaded CRG skills

- [ ] Add `build-graph` and `code-review-graph` project entries to
  `assets/catalog/SKILLS.yaml`.
- [ ] Add matching human-readable ledger rows to `assets/guides/SKILLS.md`.
- [ ] Run `mise run skill validate`.
- [ ] Run `mise run skill sync` and review generated routing changes.

Expected: both `skills-lock.json` entries have project registry matches. If
inherited baseline validator debt keeps validation red, record the detached
`HEAD` reproduction and confirm CRG adds no new violation.

## Task 3: Remove Graphify and install CRG

- [ ] Delete `graphify-out/`, `.opencode/plugins/graphify.js`, and the
  Graphify-only `.opencode/opencode.json`.
- [ ] Run `uv tool uninstall graphifyy`; inspect and remove any confirmed
  residual `graphify` executable.
- [ ] Run `uv tool install code-review-graph` or upgrade the existing tool.
- [ ] Add `mise run graph ...` automation with a pinned Mise-managed `uv`
  version.
- [ ] Verify `command -v graphify` is empty and
  `code-review-graph --version` exits 0.

Expected: Graphify is gone locally and CRG is installed through `uv`.

## Task 4: Add repo CRG policy and portable MCP configs

- [ ] Replace Graphify exclusions with `.code-review-graph` exclusions in the
  quality-tool configs and remove obsolete package-script globs.
- [ ] Add `.code-review-graphignore` with the exact patterns in `design.md`.
- [ ] Add repo MCP server entries using `uvx code-review-graph serve` for
  Claude Code, Cursor, OpenCode, Gemini CLI, and GitHub Copilot.
- [ ] Preserve existing unrelated repo configuration, especially
  `.cursor/hooks.json`.

Expected: generated CRG data remains local, quality strictness is unchanged,
and each repo-scoped client has one portable CRG MCP entry.

## Task 5: Add instructions and maintainer documentation

- [ ] Add concise CRG query-first guidance to `AGENTS.md`, `CLAUDE.md`,
  `GEMINI.md`, Cursor rules, and Copilot workspace instructions.
- [ ] Keep the root `README.md` CRG overview brief and link it to
  `assets/guides/CRG.md`.
- [ ] Add `assets/guides/CRG.md` with usage, authoritative references, project
  benefits, activation hooks, monitoring commands, best practices, and
  troubleshooting.
- [ ] Update `assets/docs/specs/README.md` with the graph migration package.
- [ ] Refresh `assets/docs/specs/graph/handoff.md` with final local activation
  details.

Expected: agents and maintainers can use CRG without reading installer source.

## Task 6: Add HK integration

- [ ] Add a non-blocking CRG `update --skip-flows` and
  `detect-changes --brief` informational step to HK pre-commit.
- [ ] Run `mise exec -- hk validate`.
- [ ] Run `mise exec -- hk check --all --check --plan --json`.
- [ ] Re-read `.git/hooks/pre-commit` and confirm it remains HK-owned.

Expected: HK owns Git hooks and CRG failures do not weaken or block the
existing quality workflow.

## Task 7: Activate local MCP and daemon configuration

- [ ] Run requested platform installers with `--no-hooks`.
- [ ] Configure Codex user-level MCP without installing hooks.
- [ ] Back up, repair, validate, and configure Antigravity user-level MCP.
- [ ] Register KB as daemon alias `kb`; start and inspect daemon status.
- [ ] If CRG 2.3.5 reports a dead detached watcher, stop the broken daemon and
  start one supervised direct `code-review-graph watch --repo
  /Users/roalcantara/Work/bun/kb` fallback process. On macOS, use a user-level
  LaunchAgent.

Expected: all seven common KB agents can reach CRG and no redundant edit hook
competes with the daemon or the documented direct-watch fallback.

## Task 8: Build and verify the graph

- [ ] Run `code-review-graph build`.
- [ ] Run `code-review-graph status`.
- [ ] Run `code-review-graph update --skip-flows`.
- [ ] Confirm `.code-review-graph/graph.db` exists and remains ignored.
- [ ] Start `uvx code-review-graph serve` briefly and stop it after successful
  startup.

Expected: the graph is healthy, incremental updates work, and MCP starts.

## Task 9: Validate, record evidence, and commit once

- [ ] Run migration-specific checks from `tasks.md` 7.1.
- [ ] Run `git diff --check`.
- [ ] Run `bash .agents/skills/app-quality-gate/scripts/gate.sh`.
- [ ] Add an `Evidence:` bullet to every completed item in `tasks.md`.
- [ ] Stage intentional files only.
- [ ] Re-run the quality gate on the staged tree and create one HK-valid
  Conventional Commit.
- [ ] Validate the resulting commit message through HK.

Expected: one commit records the full migration; generated graph data and
local user-level backups remain untracked.
