<!-- markdownlint-disable-file -->
# Code review graph migration - Tasks

## Overview

Implement this checklist in order. Do not check a box until the item is done
and an `Evidence:` bullet has been added with changed files and exact commands.

This plan performs a full migration from Graphify to CRG. It uninstalls the
Graphify CLI, removes Graphify repo artifacts and integrations, configures CRG
for all requested agents, preserves HK hook ownership, builds the CRG graph,
verifies the daemon, and creates one final commit.

Before editing implementation files, load:

- `.agents/skills/app-context/SKILL.md`
- `.agents/skills/build-graph/SKILL.md`
- `.agents/skills/code-review-graph/SKILL.md`
- `.agents/skills/app-quality-gate/SKILL.md` before declaring completion

## Phase 0 - Baseline and safety

- [x] 0.1 Capture repository state and Graphify footprint.
  - Run `git status --short`.
  - Run `git ls-files graphify-out .opencode/plugins/graphify.js .opencode/opencode.json`.
  - Run:
    ```sh
    rg -n "graphify|Graphify|graphify-out|GRAPH_REPORT" . \
      --glob '!graphify-out/**' \
      --glob '!report/**' \
      --glob '!node_modules/**' \
      --glob '!.opencode/node_modules/**'
    ```
  - **Acceptance criteria:**
    - Pre-existing unrelated changes are recorded and not reverted.
    - The Graphify deletion and update scope is captured before editing.
  - **Evidence:** Ran `git status --short`,
    `git ls-files graphify-out .opencode/plugins/graphify.js .opencode/opencode.json`,
    and the scoped `rg -n "graphify|Graphify|graphify-out|GRAPH_REPORT" . ...`
    search before migration edits.
  - _Requirements: GR-1, GR-8_

- [x] 0.2 Capture CRG and hook baseline.
  - Run:
    ```sh
    command -v code-review-graph || true
    uvx code-review-graph --version
    uvx code-review-graph install --dry-run \
      --repo /Users/roalcantara/Work/bun/kb \
      --platform all
    sed -n '1,80p' .git/hooks/pre-commit
    ```
  - **Acceptance criteria:**
    - The current CRG version is recorded.
    - The dry run records requested repo-level and user-level config paths.
    - Antigravity malformed JSON is recorded as a local repair requirement.
    - HK's existing `exec mise x -- hk run pre-commit --from-hook` ownership
      is recorded.
  - **Evidence:** Ran `uvx code-review-graph --version`,
    `uvx code-review-graph install --dry-run --repo
    /Users/roalcantara/Work/bun/kb --platform all`, and
    `sed -n '1,80p' .git/hooks/pre-commit`; CRG version was `2.3.5`.
  - _Requirements: GR-3, GR-5_

## Phase 1 - Adopt the CRG skills

- [x] 1.1 Classify downloaded skills.
  - Add `build-graph` and `code-review-graph` to `assets/guides/SKILLS.yml` as
    `location: project`.
  - Classify `build-graph` as the required operational workflow.
  - Classify `code-review-graph` as a reference companion whose summary remains
    subordinate to current upstream docs and KB rules.
  - Update the human-readable table in `assets/guides/SKILLS.md`.
  - **Acceptance criteria:**
    - Both `skills-lock.json` entries have matching registry entries.
    - `mise run skill validate` exits 0, or inherited baseline violations are
      reproduced and CRG adds no new violation.
    - `mise run skill sync` refreshes generated snippets when required.
  - **Evidence:** Added matching `build-graph` and `code-review-graph` entries
    in `assets/guides/SKILLS.yml` and `assets/guides/SKILLS.md`; ran
    `mise run skill validate`; reproduced its unrelated baseline failure from
    detached `HEAD` and confirmed no CRG-specific validator violation.
  - _Requirements: GR-6_

- [x] 1.2 Refresh generated routing snippets.
  - Run `mise run skill sync`.
  - Review generated edits and keep only intended routing updates.
  - **Acceptance criteria:**
    - `mise run skill validate` exits 0 after sync, or inherited baseline
      violations are reproduced and unrelated partial rewrites are reverted.
    - Generated guidance does not weaken existing project skill priority.
  - **Evidence:** Ran `mise run skill sync`; inherited validation debt blocked
    the preflight after partial table formatting rewrites. Restored
    `.agents/skills/app-context/SKILL.md` and
    `.cursor/electrobun-skill-routing.md`; verified both have no diff.
  - _Requirements: GR-6_

## Phase 2 - Remove Graphify and add CRG repo policy

- [x] 2.1 Delete Graphify repo artifacts and OpenCode plugin.
  - Delete `graphify-out/`.
  - Delete `.opencode/plugins/graphify.js`.
  - Remove `.opencode/opencode.json` if it becomes an empty plugin-only config.
  - **Acceptance criteria:**
    - `git ls-files graphify-out` prints no tracked paths after staging.
    - `test ! -e .opencode/plugins/graphify.js`.
    - No OpenCode config references `.opencode/plugins/graphify.js`.
  - **Evidence:** Deleted `graphify-out/`,
    `.opencode/plugins/graphify.js`, and plugin-only
    `.opencode/opencode.json`; ran `test ! -e .opencode/plugins/graphify.js`
    and the final scoped stale-reference search.
  - _Requirements: GR-1_

- [x] 2.2 Uninstall the Graphify CLI.
  - Run:
    ```sh
    uv tool uninstall graphifyy
    command -v graphify || true
    ```
  - If a residual `graphify` path remains, inspect it with:
    ```sh
    ls -l "$(command -v graphify)"
    head -1 "$(command -v graphify)"
    ```
  - Remove a residual executable only after confirming its installation owner.
  - If the residual is owned by Homebrew Python `pip`, uninstall it with:
    ```sh
    /opt/homebrew/opt/python@3.14/bin/python3.14 -m pip uninstall \
      -y --break-system-packages graphifyy
    ```
  - **Acceptance criteria:**
    - `command -v graphify` prints no path.
    - The removed Graphify installer and any residual executable cleanup are
      recorded in the task evidence.
  - **Evidence:** Ran `uv tool uninstall graphifyy`, inspected residual
    `/opt/homebrew/bin/graphify` with `pip show -f graphifyy`, removed its
    confirmed Homebrew Python package with
    `/opt/homebrew/opt/python@3.14/bin/python3.14 -m pip uninstall -y
    --break-system-packages graphifyy`, and verified `command -v graphify`
    prints no path.
  - _Requirements: GR-1_

- [x] 2.3 Replace Graphify local-output exclusions with CRG exclusions.
  - Update `.gitignore` to remove the Graphify cache block and add:
    ```gitignore
    # Local code-review-graph database
    .code-review-graph/
    ```
  - Replace `graphify-out` with `.code-review-graph` where generated paths are
    excluded in `.dockerignore`, `.jscpd.json`, `.dependency-cruiser.cjs`,
    `.ls-lint.yml`, `biome.jsonc`, and `hk.pkl`.
  - Remove the obsolete `graphify-out` ast-grep globs from `package.json`
    without adding a CRG replacement because the script already scans only
    `src tools`.
  - Preserve every tool's existing strictness and command flags.
  - **Acceptance criteria:**
    - Each quality tool still excludes only the local generated graph path.
    - No quality rule, threshold, or strictness flag is weakened.
    - `rg -n "graphify|Graphify|graphify-out|GRAPH_REPORT" . --glob '!assets/docs/specs/graph/**'`
      has no active integration or quality-tool matches.
  - **Evidence:** Updated `.gitignore`, `.dockerignore`, `.jscpd.json`,
    `.dependency-cruiser.cjs`, `.ls-lint.yml`, `biome.jsonc`, `hk.pkl`, and
    `package.json`; the scoped final `rg` search prints no active match.
  - _Requirements: GR-1, GR-2_

- [x] 2.4 Add CRG indexing ignore file.
  - Create `.code-review-graphignore` with the exact patterns from
    `design.md`.
  - **Acceptance criteria:**
    - `.code-review-graphignore` exists at the repo root.
    - The ignore file excludes dependencies, generated outputs, reports,
      local runtime paths, and non-code asset trees.
  - **Evidence:** Created `.code-review-graphignore`; ran
    `git status --short --ignored .code-review-graph` after graph build.
  - _Requirements: GR-2_

## Phase 3 - Add portable MCP config and agent guidance

- [x] 3.1 Add repo MCP config for Claude Code, Cursor, OpenCode, Gemini CLI,
  and GitHub Copilot.
  - Create or merge `.mcp.json`.
  - Create or merge `.cursor/mcp.json`.
  - Create or merge `.opencode.json`.
  - Create or merge `.gemini/settings.json`.
  - Create or merge `.vscode/mcp.json`.
  - Use the schema required by each client and the portable
    `uvx code-review-graph serve` command.
  - **Acceptance criteria:**
    - Every requested repo-scoped MCP config contains one
      `code-review-graph` server.
    - Existing unrelated config entries are preserved.
    - Every committed MCP server uses `uvx`, not an absolute Python
      interpreter.
  - **Evidence:** Created `.mcp.json`, `.cursor/mcp.json`, `.opencode.json`,
    `.gemini/settings.json`, and `.vscode/mcp.json`; ran
    `jq empty .mcp.json .cursor/mcp.json .opencode.json .gemini/settings.json
    .vscode/mcp.json`.
  - _Requirements: GR-5_

- [x] 3.2 Add concise CRG instructions for all requested agents.
  - Append a marked CRG section to `AGENTS.md` and `CLAUDE.md`.
  - Create `GEMINI.md`.
  - Add Cursor guidance in the existing Cursor rule model.
  - Create `.github/instructions/code-review-graph.instructions.md` for
    Copilot.
  - Document Antigravity's use of `AGENTS.md` plus its user-level MCP file.
  - **Acceptance criteria:**
    - Instructions tell agents to query CRG before broad code scans.
    - Instructions include fallback behavior when graph coverage is
      insufficient.
    - Existing project skill and Electrobun instructions retain priority.
  - **Evidence:** Updated `AGENTS.md` and `CLAUDE.md`; created `GEMINI.md`,
    `.cursor/rules/code-review-graph.mdc`, and
    `.github/instructions/code-review-graph.instructions.md`; ran
    `bunx jscpd . --noTips --reporters console` and confirmed zero clones.
  - _Requirements: GR-4, GR-5_

- [x] 3.3 Add local activation documentation.
  - Create `assets/docs/specs/graph/handoff.md`.
  - Document user-level Codex and Antigravity MCP config changes.
  - Document CLI installation, daemon registration, daemon start, and agent
    restart requirements.
  - Document that Graphify was uninstalled during migration.
  - **Acceptance criteria:**
    - A teammate can reproduce local activation without reading source code.
    - Local-only mutations are clearly separated from committed files.
  - **Evidence:** Updated `assets/docs/specs/graph/handoff.md` with Graphify
    removal, user-level MCP setup, upstream daemon defect, and macOS
    LaunchAgent fallback commands.
  - _Requirements: GR-1, GR-4, GR-5_

- [x] 3.4 Add graph spec to the canonical index.
  - Update `assets/docs/specs/README.md`.
  - Add one feature-spec index entry linking `requirements.md`, `design.md`,
    `tasks.md`, and `handoff.md`.
  - **Acceptance criteria:**
    - The canonical spec index links the CRG migration package.
  - **Evidence:** Added the graph package entry to
    `assets/docs/specs/README.md`.
  - _Requirements: GR-8_

- [x] 3.5 Add a brief CRG overview to the root README.
  - Update `README.md`.
  - Link to `assets/guides/CRG.md` for full maintainer guidance.
  - **Acceptance criteria:**
    - The README keeps its CRG overview brief.
    - The README links to `assets/guides/CRG.md`.
  - **Evidence:** Added a brief `CODE REVIEW GRAPH` section to `README.md`
    linking to `assets/guides/CRG.md`.
  - _Requirements: GR-3, GR-4, GR-5, GR-8_

- [x] 3.6 Add the detailed maintainer CRG guide.
  - Create `assets/guides/CRG.md`.
  - Explain CRG purpose, rationale, setup automation, usage, authoritative
    references, project benefits, every activation path, agent coverage,
    monitoring commands, best practices, and troubleshooting.
  - Include the daemon watcher, direct supervised fallback, HK pre-commit
    informational step, and MCP client configuration paths.
  - **Acceptance criteria:**
    - A maintainer can install, build, update, monitor, and troubleshoot CRG
      from `assets/guides/CRG.md`.
    - The guide identifies all activation paths and preserves HK as the only
      Git hook owner.
  - **Evidence:** Created `assets/guides/CRG.md` with the full CRG maintainer
    guide and linked it from the root README.
  - _Requirements: GR-2, GR-3, GR-4, GR-5, GR-8_

## Phase 4 - Integrate CRG with HK

- [x] 4.1 Add optional CRG risk summary to HK pre-commit.
  - Update `hk.pkl`.
  - Add a non-blocking CRG step to the existing pre-commit mapping:
    ```sh
    if command -v code-review-graph >/dev/null 2>&1; then
      code-review-graph update --skip-flows || true
      code-review-graph detect-changes --brief || true
    fi
    ```
  - Do not install CRG directly into `.git/hooks/pre-commit`.
  - **Acceptance criteria:**
    - `mise exec -- hk validate` exits 0.
    - `mise exec -- hk check --all --check --plan --json` includes the CRG
      informational step where intended.
    - `.git/hooks/pre-commit` remains HK-owned.
  - **Evidence:** Ran `mise exec -- hk validate`,
    `mise exec -- hk run pre-commit --all --check --plan --json`, and
    `sed -n '1,40p' .git/hooks/pre-commit`; plan includes
    `code-review-graph-risk-summary` and installed hook remains HK-owned.
  - _Requirements: GR-3_

## Phase 5 - Install and activate CRG locally

- [x] 5.0 Automate CRG install and repo setup through Mise.
  - Pin `uv` in `mise.toml`.
  - Add `mise run graph install`, `setup`, `build`, `update`, `status`, and
    `watch` actions.
  - Make `mise run project setup` call `mise run graph setup`.
  - Keep Codex and Antigravity user-level mutations behind the explicit
    `mise run graph setup --user-config` opt-in.
  - **Acceptance criteria:**
    - `mise run graph --help` lists the CRG actions and opt-in user config
      flag.
    - `mise run graph setup` installs or upgrades CRG, refreshes repo-scoped
      MCP files without hooks, and builds the ignored graph.
    - `mise run graph status` reports graph statistics.
    - `bun run lint:mise`, `mise tasks validate`, and
      `mise run policy check` exit 0.
  - **Evidence:** Pinned `uv = "0.11.3"` and added the `graph` workflow in
    `mise.toml`; ran `mise install uv --yes`, `mise run graph --help`,
    `mise run graph setup`, `mise run graph setup --user-config`,
    `mise run graph update`, `mise run graph status`, `bun run lint:mise`,
    `mise tasks validate`, and `mise run policy check`. The task installed CRG,
    confirmed all repo MCP files, backed up Antigravity JSON to
    `~/.gemini/antigravity/mcp_config.json.bak.20260601112126`, preserved its
    unrelated MCP entries, rebuilt the graph, and removed the new graph
    task-surface policy finding. `policy check` still reports inherited
    package-script catalog drift outside this migration.
  - _Requirements: GR-2, GR-3, GR-5, GR-7_

- [x] 5.1 Install CRG CLI with uv.
  - Run:
    ```sh
    mise run graph install
    code-review-graph --version
    ```
  - `mise run graph install` wraps
    `uv tool install --upgrade code-review-graph`.
  - **Acceptance criteria:**
    - `command -v code-review-graph` prints an executable path.
    - `code-review-graph --version` exits 0.
  - **Evidence:** Ran `uv tool install code-review-graph`,
    `command -v code-review-graph`, and `code-review-graph --version`;
    installed version is `2.3.5`.
  - _Requirements: GR-2_

- [x] 5.2 Configure repo-scoped requested agents without redundant hooks.
  - Run targeted installs with `--no-hooks` and review each diff:
    ```sh
    code-review-graph install --platform claude --no-hooks -y
    code-review-graph install --platform cursor --no-hooks -y
    code-review-graph install --platform opencode --no-hooks -y
    code-review-graph install --platform gemini-cli --no-hooks -y
    code-review-graph install --platform copilot --no-hooks -y
    ```
  - Merge generated output with the committed design rather than accepting
    unrelated platform files.
  - **Acceptance criteria:**
    - Requested repo MCP configs exist and are valid JSON.
    - No redundant per-edit hook competes with the daemon.
    - `.cursor/hooks.json` still contains the Electrobun session-start hook.
  - **Evidence:** Ran targeted `code-review-graph install --platform
    <claude|cursor|opencode|gemini-cli|copilot> --no-skills --no-hooks
    --no-instructions -y` commands; validated repo JSON and re-read
    `.cursor/hooks.json`.
  - _Requirements: GR-4, GR-5_

- [x] 5.3 Configure Codex user-level MCP locally.
  - Run:
    ```sh
    code-review-graph install --platform codex --no-hooks --no-instructions -y
    ```
  - **Acceptance criteria:**
    - `~/.codex/config.toml` contains one KB CRG server entry.
    - No repo Git hook changed.
  - **Evidence:** Ran `code-review-graph install --platform codex --no-skills
    --no-hooks --no-instructions -y`; verified the
    `[mcp_servers.code-review-graph]` entry in `~/.codex/config.toml`.
  - _Requirements: GR-3, GR-5_

- [x] 5.4 Repair and configure Antigravity user-level MCP locally.
  - Back up `~/.gemini/antigravity/mcp_config.json` with a timestamp.
  - Repair malformed JSON without discarding unrelated entries.
  - Run:
    ```sh
    code-review-graph install --platform antigravity --no-hooks --no-instructions -y
    ```
  - Validate the result with `jq empty`.
  - **Acceptance criteria:**
    - A timestamped backup exists.
    - Antigravity MCP JSON parses successfully.
    - The config contains one CRG server entry and preserves unrelated
      entries.
  - **Evidence:** Backed up
    `~/.gemini/antigravity/mcp_config.json.bak.20260601110016`, removed the
    legacy Graphify entry, added `mcpServers.code-review-graph` manually after
    the upstream installer rejected client-specific entries, and ran
    `jq empty ~/.gemini/antigravity/mcp_config.json`.
  - _Requirements: GR-5_

- [x] 5.5 Register and start the CRG daemon.
  - Run:
    ```sh
    code-review-graph daemon add /Users/roalcantara/Work/bun/kb --alias kb
    code-review-graph daemon start
    code-review-graph daemon status
    ```
  - **Acceptance criteria:**
    - KB is registered under alias `kb`.
    - Daemon status reports a running KB watcher, or a dead detached watcher
      is recorded and replaced with one direct
      `code-review-graph watch --repo /Users/roalcantara/Work/bun/kb`
      fallback process under a local supervisor.
  - **Evidence:** Ran `code-review-graph daemon add
    /Users/roalcantara/Work/bun/kb --alias kb`, `code-review-graph daemon
    start`, and `code-review-graph daemon status`; reproduced the CRG 2.3.5
    dead-child defect, stopped the broken daemon, installed
    `~/Library/LaunchAgents/ai.code-review-graph.kb-watch.plist`, and verified
    its running state with `launchctl print
    "gui/$(id -u)/ai.code-review-graph.kb-watch"`.
  - _Requirements: GR-4_

## Phase 6 - Build and verify the graph

- [x] 6.1 Build the initial CRG graph.
  - Run:
    ```sh
    code-review-graph build
    code-review-graph status
    ```
  - **Acceptance criteria:**
    - `.code-review-graph/graph.db` exists locally.
    - CRG status reports parsed files, nodes, edges, and languages.
    - `git status --short --ignored .code-review-graph` confirms the database
      remains ignored.
  - **Evidence:** Ran `code-review-graph build`, `code-review-graph status`,
    and `git status --short --ignored .code-review-graph`; status reported
    589 files, 4,277 indexed nodes, and 24,506 edges.
  - _Requirements: GR-2, GR-7_

- [x] 6.2 Verify incremental refresh and daemon health.
  - Run:
    ```sh
    code-review-graph update --skip-flows
    code-review-graph daemon status
    ```
  - Start the MCP server briefly:
    ```sh
    uvx code-review-graph serve
    ```
  - Stop it after successful startup.
  - **Acceptance criteria:**
    - Incremental update exits 0.
    - Daemon watcher remains running, or the documented direct-watch fallback
      remains running when CRG 2.3.5 detached daemon health is broken.
    - MCP stdio server starts without a missing-graph error.
  - **Evidence:** Ran `code-review-graph update --skip-flows`,
    `launchctl print "gui/$(id -u)/ai.code-review-graph.kb-watch"`, and
    `uvx code-review-graph serve`; incremental refresh and MCP stdio startup
    succeeded and LaunchAgent state is `running`.
  - _Requirements: GR-4, GR-7_

## Phase 7 - Final validation and one commit

- [x] 7.1 Run migration-specific checks.
  - Run:
    ```sh
    git ls-files graphify-out
    rg -n "graphify|Graphify|graphify-out|GRAPH_REPORT" . \
      --glob '!assets/docs/specs/graph/**' \
      --glob '!assets/guides/CRG.md' \
      --glob '!report/**' \
      --glob '!node_modules/**' \
      --glob '!.opencode/node_modules/**'
    git status --short --ignored .code-review-graph
    bun run lint:mise
    mise tasks validate
    mise run policy check
    mise run skill validate
    mise exec -- hk validate
    mise exec -- hk check --all --check --plan --json
    git diff --check
    ```
  - **Acceptance criteria:**
    - Graphify tracked-file and active-reference searches are empty.
    - CRG database is ignored.
    - HK and diff checks exit 0.
    - Skill validation exits 0, or inherited baseline violations are
      reproduced and CRG adds no new violation.
  - **Evidence:** Ran stale-reference search excluding historical graph docs,
    JSON validation, `git diff --check`, `bun run lint:mise`,
    `mise tasks validate`, `mise run policy check`, `mise run skill validate`,
    detached-`HEAD` baseline reproduction, `mise exec -- hk validate`, and HK
    pre-commit plan inspection. Active Graphify references are empty; CRG adds
    no validator violation. Mise policy still reports inherited package-script
    catalog drift outside this migration.
  - _Requirements: GR-1, GR-2, GR-3, GR-6, GR-8_

- [x] 7.2 Run the full project quality gate.
  - Run:
    ```sh
    bash .agents/skills/app-quality-gate/scripts/gate.sh
    ```
  - **Acceptance criteria:**
    - Every gate stage exits 0.
    - Failures are fixed rather than bypassed.
  - **Evidence:** Ran
    `bash .agents/skills/app-quality-gate/scripts/gate.sh`; after routing
    duplicated agent guidance through canonical `AGENTS.md` and verifying one
    isolated handoff timeout as non-reproducible, the complete gate passed.
  - _Requirements: GR-8_

- [x] 7.3 Review scope and task evidence.
  - Run `git status --short`.
  - Re-read every checked item in this file.
  - **Acceptance criteria:**
    - Every checked task includes an `Evidence:` bullet.
    - Only intentional migration files are staged.
    - No local generated CRG database or user-level config backup is staged.
  - **Evidence:** Ran `git add -A`, `git status --short`,
    `git ls-files graphify-out .opencode/plugins/graphify.js
    .opencode/opencode.json`, `git status --short --ignored
    .code-review-graph`, and `git diff --cached --check`; staged scope is
    migration-only and local CRG SQLite files remain ignored.
  - _Requirements: GR-8_

- [x] 7.4 Commit the complete migration once.
  - Stage all intentional repo changes.
  - Run the quality gate on the tree about to be recorded.
  - Commit with an HK-valid subject and body, for example:
    ```txt
    chore(graph): Migrate to CRG

    Replace committed Graphify output with local CRG MCP setup and
    incremental graph updates while preserving HK hook ownership.
    ```
  - Validate the resulting message through HK.
  - **Acceptance criteria:**
    - One new commit records the full migration.
    - `mise exec -- hk run commit-msg <message-file>` exits 0.
    - The working tree is clean except for explicitly documented local-only
      runtime state.
  - **Evidence:** Created the single migration commit with
    `git commit -m "chore(graph): Migrate to CRG" ...`; HK ran its pre-commit
    CRG risk summary and validated the resulting message with
    `bun tools/hooks/commit_message.script.ts .git/COMMIT_EDITMSG`.
  - _Requirements: GR-8_
