<!-- markdownlint-disable-file -->
# Code review graph migration - Requirements

## Introduction

KB currently commits a Graphify knowledge graph under `graphify-out/`, excludes
that directory from the quality stack, and ships an OpenCode reminder plugin
that points agents at `graphify-out/GRAPH_REPORT.md`. The local Graphify tree is
large because generated artifacts, caches, and a Python virtual environment
accumulate under one output directory. Rebuild latency also makes it a poor fit
for updating after normal agent edits.

This migration replaces Graphify with
[code-review-graph](https://github.com/tirth8205/code-review-graph) (CRG).
CRG stores a structural Tree-sitter graph in local SQLite, exposes graph
queries through MCP, and supports incremental updates. KB will use CRG as its
only code graph. It will not keep Graphify as a fallback.

## Approved decision

Adopt CRG only:

- Use CRG for code-focused graph queries, blast-radius analysis, review
  context, and incremental updates.
- Remove the installed Graphify CLI, committed Graphify output,
  Graphify-specific integration, and Graphify-specific exclusions.
- Keep CRG runtime data local and ignored. Do not commit
  `.code-review-graph/graph.db`.
- Preserve HK as the Git hook owner. Integrate CRG through HK instead of
  allowing the CRG installer to append unreachable commands after HK's
  `exec`.
- Use CRG's daemon as the cross-agent freshness mechanism.

## Sources

- CRG repository: https://github.com/tirth8205/code-review-graph
- CRG package: https://pypi.org/project/code-review-graph/
- CRG install guide: https://code-review-graph.com/install
- Graphify repository: https://github.com/safishamsi/graphify
- Graphify package: https://pypi.org/project/graphifyy/
- Comparison article:
  https://dev.to/mir_mursalin_ankur/graphify-code-review-graph-build-a-self-updating-knowledge-graph-for-claude-code-and-other-ai-j1m
- Project hook contract: `hk.pkl`
- Project skill registry: `assets/catalog/SKILLS.yaml`
- Maintainer CRG guide: `assets/guides/CRG.md`

## Current state

Migration to CRG is complete in the repository (see [`tasks.md`](tasks.md)
evidence). Graphify output, the OpenCode Graphify plugin, and Graphify-specific
quality exclusions are removed.

- CRG is the only code graph; local data lives under `.code-review-graph/`
  (gitignored) with scope defined in `.code-review-graphignore`.
- Repo MCP configs (`.mcp.json`, `.cursor/mcp.json`, `.opencode.json`,
  `.gemini/settings.json`, `.vscode/mcp.json`) use `uvx code-review-graph
  serve`. After clone, run `mise run graph setup` so each file's `cwd` matches
  the checkout path on that machine.
- `mise run graph {install,setup,build,update,status,watch}` wraps `uv tool`
  install, platform MCP refresh (`--no-hooks --no-skills --no-instructions`),
  and graph build/update.
- HK owns Git hooks; pre-commit runs an optional, non-blocking CRG
  `update --skip-flows` and `detect-changes --brief` step when the CLI is
  installed.
- `build-graph` and `code-review-graph` are classified in
  `assets/catalog/SKILLS.yaml`, documented in `assets/guides/SKILLS.md`, and
  restored with `mise run skill install`.
- Maintainer operations: [`assets/guides/CRG.md`](../../../guides/CRG.md) and
  [`handoff.md`](handoff.md).
- On machines with malformed Antigravity user MCP JSON,
  `mise run graph setup --user-config` backs up, validates, and merges CRG
  without discarding unrelated entries.

## Out of scope

- Keeping Graphify for docs, PDFs, images, videos, or a fallback query path.
- Committing `.code-review-graph/graph.db` or any generated CRG database.
- Installing CRG optional embedding, wiki, evaluation, or enrichment extras.
- Weakening Biome, knip, dependency-cruiser, ast-grep, ls-lint, jscpd, HK, or
  TypeScript rules.
- Replacing HK as the Git hook manager.
- Adding user-visible application behavior or end-to-end Gherkin scenarios.
- Configuring agents beyond Codex, Claude Code, Cursor, OpenCode, Antigravity,
  Gemini CLI, and GitHub Copilot.

## Requirement syntax

- **WHEN** _event_, **THEN** the system **SHALL** _response_.
- **IF** _precondition_, **THEN** the system **SHALL** _response_.

## Requirement GR-1: Remove Graphify completely

### Acceptance criteria

1. WHEN the migration is complete, THEN no tracked file SHALL remain under
   `graphify-out/`.
2. WHEN the migration is complete, THEN `.opencode/plugins/graphify.js` SHALL
   be deleted.
3. WHEN active repo files are searched for `graphify`, `Graphify`,
   `graphify-out`, or `GRAPH_REPORT`, THEN no active non-spec, non-guide
   integration or quality-tool reference SHALL remain.
4. WHEN Graphify-specific quality exclusions are removed, THEN equivalent CRG
   local-data exclusions SHALL be added where tools walk ignored directories.
5. WHEN Graphify is removed from KB, THEN the installed `graphify` CLI SHALL
   be uninstalled.
6. WHEN Graphify uninstall completes, THEN `command -v graphify` SHALL print no
   path.
7. IF an uninstall command leaves a residual `graphify` executable, THEN the
   implementation SHALL inspect its owning installation before deleting that
   residual executable.

## Requirement GR-2: Install CRG and keep generated data local

### Acceptance criteria

1. WHEN CRG is installed for the user, THEN the supported command SHALL be
   `mise run graph install`, which wraps
   `uv tool install --upgrade code-review-graph`.
2. WHEN `.gitignore` is updated, THEN it SHALL ignore `.code-review-graph/`.
3. WHEN `.code-review-graphignore` is added, THEN it SHALL exclude generated,
   dependency, build, report, and local runtime paths that do not belong in a
   code graph.
4. WHEN CRG creates `.code-review-graph/`, THEN the directory SHALL contain an
   inner `.gitignore` that prevents database commits.
5. WHEN the graph is built, THEN `.code-review-graph/graph.db` SHALL exist
   locally and SHALL remain untracked.
6. WHEN a teammate runs `mise run graph setup`, THEN Mise SHALL provision its
   pinned `uv` version, install or upgrade CRG, refresh repo MCP files without
   redundant hooks, and build the ignored local graph.
7. WHEN a teammate explicitly runs `mise run graph setup --user-config`, THEN
   the workflow SHALL also merge local-only Codex and Antigravity MCP files,
   backing up and validating Antigravity JSON without discarding unrelated
   entries.

## Requirement GR-3: Preserve HK hook ownership

### Acceptance criteria

1. WHEN local Git hooks are inspected, THEN `.git/hooks/pre-commit` SHALL
   continue to execute `mise x -- hk run pre-commit --from-hook`.
2. WHEN CRG setup runs, THEN it SHALL NOT append CRG commands directly to
   `.git/hooks/pre-commit`.
3. WHEN HK's pre-commit profile runs and CRG is installed, THEN HK SHALL run an
   optional CRG incremental update followed by
   `code-review-graph detect-changes --brief`.
4. WHEN HK's pre-commit profile runs and CRG is absent, THEN the CRG step SHALL
   skip without blocking a commit.
5. WHEN CRG update or risk summary fails, THEN the CRG step SHALL report the
   failure but SHALL NOT replace the existing quality gate or block a commit.

## Requirement GR-4: Keep the graph fresh across agents

### Acceptance criteria

1. WHEN KB is registered with CRG, THEN
   `code-review-graph daemon add /Users/roalcantara/Work/bun/kb --alias kb`
   SHALL configure the repo watcher.
2. WHEN the CRG daemon is started, THEN `code-review-graph daemon status`
   SHALL report the KB watcher as running or the setup SHALL stop the broken
   daemon and start a supervised direct `code-review-graph watch` fallback.
3. WHEN a tracked code file changes, THEN the watcher SHALL incrementally
   refresh the local CRG graph without requiring Graphify.
4. WHEN an agent-specific hook also supports CRG, THEN the setup SHALL avoid
   redundant edit-triggered rebuild hooks because the daemon or documented
   direct-watch fallback is the shared freshness owner.
5. WHEN an agent session needs graph context, THEN project instructions SHALL
   tell the agent to use CRG MCP tools before broad codebase scans.
6. IF CRG 2.3.5 daemon status reports a dead KB child after startup, THEN the
   setup SHALL document the upstream daemonization defect and supervise
   `code-review-graph watch --repo /Users/roalcantara/Work/bun/kb` until an
   upstream release fixes detached watcher health.

## Requirement GR-5: Configure the requested agents

### Acceptance criteria

1. WHEN Codex is configured, THEN its user-level MCP config SHALL expose the
   `code-review-graph` stdio server for KB.
2. WHEN Claude Code is configured, THEN `.mcp.json` SHALL expose the
   `code-review-graph` stdio server and `CLAUDE.md` SHALL include CRG usage
   guidance.
3. WHEN Cursor is configured, THEN `.cursor/mcp.json` SHALL expose the CRG
   stdio server, `.cursor/hooks.json` SHALL retain the existing Electrobun
   session-start hook, and Cursor guidance SHALL include CRG usage.
4. WHEN OpenCode is configured, THEN `.opencode.json` SHALL expose the CRG
   stdio server and `AGENTS.md` SHALL include CRG usage guidance.
5. WHEN Antigravity is configured, THEN its user-level malformed JSON SHALL be
   backed up, repaired manually, and validated before CRG is added.
6. WHEN Gemini CLI is configured, THEN `.gemini/settings.json` SHALL expose
   the CRG stdio server and `GEMINI.md` SHALL include CRG usage guidance.
7. WHEN GitHub Copilot is configured, THEN `.vscode/mcp.json` SHALL expose the
   CRG stdio server and
   `.github/instructions/code-review-graph.instructions.md` SHALL contain
   workspace guidance.
8. WHEN repository MCP config files are committed, THEN they SHALL use `uvx
   code-review-graph serve` so teammates do not depend on this machine's
   absolute Python path.
9. WHEN user-level MCP configs are changed, THEN the committed docs SHALL
   identify those local-only mutations and the commands used to reproduce
   them.

## Requirement GR-6: Classify the downloaded CRG skills

### Acceptance criteria

1. WHEN `skills-lock.json` contains `build-graph` and `code-review-graph`, THEN
   `assets/catalog/SKILLS.yaml` SHALL classify both as project-managed skills.
2. WHEN the project skill ledger is updated, THEN `assets/guides/SKILLS.md`
   SHALL explain that `build-graph` is the operational MCP workflow and
   `code-review-graph` is supporting reference guidance.
3. WHEN `mise run skill validate` is run, THEN CRG SHALL add no new registry
   violations; IF inherited lock/registry debt keeps the command red, THEN the
   baseline reproduction SHALL be recorded.
4. WHEN generated skill routing snippets require refresh, THEN
   `mise run skill sync` SHALL be attempted and its intentional changes
   reviewed; IF inherited validation debt blocks sync, THEN partial unrelated
   rewrites SHALL be reverted.

## Requirement GR-7: Build and verify the CRG graph

### Acceptance criteria

1. WHEN initial setup is complete, THEN `code-review-graph build` SHALL exit
   0.
2. WHEN `code-review-graph status` is run, THEN it SHALL report parsed files,
   nodes, edges, and detected languages.
3. WHEN `code-review-graph update --skip-flows` is run after the initial
   build, THEN it SHALL exit 0.
4. WHEN CRG MCP is started through `uvx code-review-graph serve`, THEN it
   SHALL start without a missing-graph error.
5. WHEN Graphify stale references are searched after the migration, THEN only
   historical migration-spec and CRG-guide rationale text MAY match.

## Requirement GR-8: Validate and commit one migration

### Acceptance criteria

1. WHEN implementation is complete, THEN every checked task in `tasks.md`
   SHALL include an `Evidence:` bullet with exact commands.
2. WHEN `git diff --check` is run, THEN it SHALL exit 0.
3. WHEN `mise run skill validate` is run, THEN it SHALL exit 0 or its inherited
   baseline failure SHALL be reproduced and recorded without adding CRG
   violations.
4. WHEN `mise exec -- hk validate` is run, THEN it SHALL exit 0.
5. WHEN `bash .agents/skills/app-quality-gate/scripts/gate.sh` is run, THEN it
   SHALL exit 0.
6. WHEN the final working tree is reviewed, THEN only intentional migration
   files SHALL be staged.
7. WHEN the migration is committed, THEN all intentional repo changes SHALL
   be recorded in one Conventional Commit with an HK-valid subject and body.
8. WHEN the graph spec is added, THEN `assets/docs/archive/README.md` SHALL link
   to its requirements, design, tasks, and handoff files.
9. WHEN the migration is documented for maintainers, THEN the root `README.md`
   SHALL contain a brief CRG overview linking to `assets/guides/CRG.md`.
10. WHEN `assets/guides/CRG.md` is read, THEN it SHALL explain CRG purpose,
    rationale, setup automation, usage, upstream references, every activation
    hook, agent coverage, monitoring commands, best practices, and
    troubleshooting steps.
