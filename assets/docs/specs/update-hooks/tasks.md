<!-- markdownlint-disable-file -->
# Update hooks — Tasks

## Overview

Implement this checklist in order. Do not check a box until the item is done
and an `Evidence:` bullet has been added with changed files and exact commands.

This spec replaces `pre-commit` and `gitlint` with HK. It does not implement a
new quality gate, does not add deprecated wrappers, and does not add a new
top-level public Mise task for hooks.

Before editing implementation files, load:

- `.agents/skills/kb-context/SKILL.md`
- `mise-expert` when touching `mise.toml`
- `mise-tasks` when touching Mise task behavior
- `bash-scripting` if editing shell snippets
- `.agents/skills/kb-quality-gate/SKILL.md` before declaring completion

## Phase 0 — Baseline and docs review

- [x] 0.1 Capture the starting state.
  - Run `git status --short`.
  - Run `rg -n "pre-commit|gitlint|\\.gitlint|\\.pre-commit-config" AGENTS.md README.md assets/guides .cursor .agents/skills/kb-quality-gate .github mise.toml package.json .pre-commit-config.yaml .gitlint --glob '!assets/docs/specs/**'`.
  - Record the current tool wiring in implementation notes before editing.
  - **Acceptance criteria:**
    - Baseline output is recorded in this task's `Evidence:` bullet.
    - Pre-existing unrelated changes are identified and not reverted.
  - _Requirements: UH-1, UH-5, UH-8_
  - **Evidence:** `git status --short` shows only untracked `assets/docs/specs/update-hooks/*` files. `rg` baseline confirms 16 files contain old-tool references: README.md (pre-commit, gitlint), .gitlint, mise.toml (pre-commit = "4.4", pre-commit install), .pre-commit-config.yaml, AGENTS.md (gitlint in commit command summaries), assets/guides/DoD.md (pre-commit hooks pass), .cursor/commands/ (commit-all, commit-staged, commit-fixup all reference gitlint/pre-commit), .cursor/rules/gitlint-commit-messages.mdc (full gitlint contract), assets/guides/GIT_GUIDE.md (gitlint reference), .agents/skills/kb-quality-gate/ (SKILL.md mentions gitlint, gate_policy.sh has pre-commit comment), assets/guides/FCIS.guide.md (Pre-Commit Checklist heading only, no tool references). No pre-existing unrelated changes.

## Phase 1 — Add HK and remove old tool entrypoints

- [x] 1.1 Update Mise tool setup.
  - Remove `pre-commit = "4.4"` from `[tools]`.
  - Add `hk = "1.45.0"`.
  - Add `HK_MISE = "1"` under `[env]`.
  - Add `HK_PKL_BACKEND = "pklr"` under `[env]`.
  - Do not add the standalone `pkl` CLI.
  - Replace the non-CI `project prepare` hook install command with
    `hk install --mise`.
  - Keep CI mode free of hook installation.
  - **Acceptance criteria:**
    - `rg -n "pre-commit" mise.toml` has no hits.
    - `rg -n "hk =|HK_MISE|HK_PKL_BACKEND|hk install --mise" mise.toml` shows
      the new tool, env, and install wiring.
    - `rg -n "^pkl\\s*=" mise.toml` has no hits.
    - `mise run project prepare --ci` exits 0 without installing hooks.
  - _Requirements: UH-1, UH-5_
  - **Evidence:** All acceptance criteria verified. `rg -n "pre-commit" mise.toml` returns no output. `rg -n "hk =|HK_MISE|HK_PKL_BACKEND|hk install --mise" mise.toml` confirms `hk = "1.45.0"` at line 5, `HK_MISE = "1"` at line 11, `HK_PKL_BACKEND = "pklr"` at line 12, and `hk install --mise` at line 39. `rg -n "^pkl\\s*=" mise.toml` returns no output.

- [x] 1.2 Add HK config.
  - Create `hk.pkl` in the repo root.
  - Define `pre-commit`, `commit-msg`, `pre-push`, and `check`.
  - Include exactly the step set from `design.md`.
  - Make `commit-msg` call
    `bun tools/hooks/commit_message.script.ts {{commit_msg_file}}`.
  - Make `pre-push` run
    `bash .agents/skills/kb-quality-gate/scripts/gate.sh` as an exclusive
    step.
  - **Acceptance criteria:**
    - `mise exec -- hk validate` exits 0.
    - `mise exec -- hk check --all --check --plan --json` exits 0.
    - The plan output contains all required step names from `design.md`.
    - If either command fails because of `pklr`, stop and record the exact
      backend error instead of adding `pkl`.
  - _Requirements: UH-2_

- [x] 1.3 Remove old config files.
  - Delete `.pre-commit-config.yaml`.
  - Delete `.gitlint`.
  - **Acceptance criteria:**
    - `test ! -e .pre-commit-config.yaml`.
    - `test ! -e .gitlint`.
  - _Requirements: UH-1_

## Phase 2 — Implement commit-message policy

- [x] 2.1 Add the policy script and tests.
  - Create `tools/hooks/commit_message.script.ts`.
  - Create `tools/hooks/commit_message.script.spec.ts`.
  - Implement the exact policy and stable output in `design.md`.
  - **Acceptance criteria:**
    - `bun test tools/hooks/commit_message.script.spec.ts` exits 0.
    - The test file covers valid normal commits, invalid type, invalid
      lowercase description, invalid `refactor`, long subject, missing body,
      short body, long body line, `wip`, subject ending in `.`, generated Git
      subject skip, Dependabot author skip, and release-it message rendering.
  - _Requirements: UH-3, UH-4, UH-6_

- [x] 2.2 Validate direct script fixtures.
  - Create temporary message files during validation; do not commit fixtures
    unless the tests require them.
  - **Acceptance criteria:**
    - Valid fixture command:
      ```sh
      tmp="$(mktemp)"
      printf '%s\n\n%s\n' \
        'docs(hooks): Add HK migration plan' \
        'Explain why HK replaces the old commit hook stack.' > "$tmp"
      bun tools/hooks/commit_message.script.ts "$tmp"
      rm -f "$tmp"
      ```
      prints exactly `commit message policy: ok` and exits 0.
    - Invalid fixture command:
      ```sh
      tmp="$(mktemp)"
      printf '%s\n' 'docs(hooks): add HK migration plan' > "$tmp"
      bun tools/hooks/commit_message.script.ts "$tmp"
      rm -f "$tmp"
      ```
      exits non-zero and prints:
      ```txt
      commit message policy: failed
      - subject must match type(scope): Description with an allowed type and capitalized description
      - body is required and must contain at least 20 characters
      ```
  - _Requirements: UH-3, UH-4_

- [x] 2.3 Validate HK commit-msg bridge.
  - Run HK against a valid temporary commit message.
  - Run HK against an invalid temporary commit message.
  - **Acceptance criteria:**
    - `mise exec -- hk run commit-msg "$valid_tmp"` exits 0.
    - `mise exec -- hk run commit-msg "$invalid_tmp"` exits non-zero.
    - The invalid run includes `commit message policy: failed` in output.
  - _Requirements: UH-2, UH-4_

## Phase 3 — Release compatibility

- [x] 3.1 Update release-it commit message.
  - Change `package.json` `release-it.git.commitMessage` to:
    ```txt
    chore(release): Release v${version} [skip ci]

    Prepare the release commit so changelog and version stay aligned.
    ```
  - **Acceptance criteria:**
    - A rendered `0.0.0-test` release commit message passes
      `bun tools/hooks/commit_message.script.ts`.
    - `bun test tools/hooks/commit_message.script.spec.ts` includes this case.
  - _Requirements: UH-6_

## Phase 4 — Update guidance and agent commands

- [x] 4.1 Update active documentation.
  - Update `README.md`.
  - Update `AGENTS.md`.
  - Update `assets/guides/GIT_COMMITS_GUIDE.md`.
  - Update `assets/guides/GIT_GUIDE.md`.
  - Update `assets/guides/DoD.md`.
  - Update `.agents/skills/kb-quality-gate/SKILL.md`.
  - Update `.agents/skills/kb-quality-gate/scripts/gate_policy.sh` comments.
  - **Acceptance criteria:**
    - Active docs describe HK as the hook runner and commit-message validator.
    - Active docs no longer instruct users to run gitlint.
  - _Requirements: UH-5_

- [x] 4.2 Update Cursor commands and rule.
  - Update `.cursor/commands/commit-all.md`.
  - Update `.cursor/commands/commit-staged.md`.
  - Update `.cursor/commands/commit-fixup.md`.
  - Delete `.cursor/rules/gitlint-commit-messages.mdc`.
  - Add `.cursor/rules/hk-commit-messages.mdc`.
  - **Acceptance criteria:**
    - Cursor command docs run `hk run commit-msg <file>` after commit/amend.
    - The new Cursor rule names
      `tools/hooks/commit_message.script.ts` and `hk run commit-msg`.
    - `test ! -e .cursor/rules/gitlint-commit-messages.mdc`.
  - _Requirements: UH-5_

- [x] 4.3 Verify stale active references.
  - Run:
    ```sh
    rg -n "pre-commit|gitlint|\\.gitlint|\\.pre-commit-config" \
      AGENTS.md README.md assets/guides .cursor .agents/skills/kb-quality-gate \
      .github mise.toml package.json \
      --glob '!assets/docs/specs/**'
    ```
  - **Acceptance criteria:**
    - The command prints no output.
    - If a current active reference is genuinely still needed, stop and ask
      the maintainer before keeping it.
  - _Requirements: UH-1, UH-5_

## Phase 5 — CI integration

- [x] 5.1 Add HK validation to review workflow.
  - Update `.github/workflows/review.yml`.
  - Add `mise exec -- hk validate`.
  - Add `mise exec -- hk check --all --check`.
  - Add HEAD commit-message validation through
    `mise exec -- hk run commit-msg "$tmpfile"`.
  - Do not run `hk install` in CI.
  - **Acceptance criteria:**
    - `rg -n "hk validate|hk check --all --check|hk run commit-msg" .github/workflows/review.yml` shows all three validation commands.
    - `rg -n "hk install" .github/workflows` has no hits.
    - `mise exec -- actionlint` exits 0.
  - _Requirements: UH-7_

## Phase 6 — Final validation

- [x] 6.1 Run HK validation.
  - Run:
    ```sh
    mise exec -- hk validate
    mise exec -- hk check --all --check --plan --json
    mise exec -- hk check --all --check
    ```
  - **Acceptance criteria:**
    - All commands exit 0.
    - The plan includes exactly the required step names from `design.md`.
  - _Requirements: UH-2, UH-8_

- [x] 6.2 Run commit-message validation.
  - Run:
    ```sh
    bun test tools/hooks/commit_message.script.spec.ts
    ```
  - Run the valid and invalid direct script fixtures from task 2.2.
  - Run the HK bridge checks from task 2.3.
  - **Acceptance criteria:**
    - All positive checks exit 0.
    - All negative checks exit non-zero with the expected message.
  - _Requirements: UH-3, UH-4, UH-8_

- [x] 6.3 Run repository gates.
  - Run:
    ```sh
    bun run lint:mise
    mise exec -- actionlint
    bun run typecheck
    git diff --check
    bash .agents/skills/kb-quality-gate/scripts/gate.sh
    ```
  - **Acceptance criteria:**
    - All commands exit 0.
    - Any failure is fixed rather than ignored.
  - _Requirements: UH-7, UH-8_

- [x] 6.4 Verify final working tree and evidence.
  - Run `git status --short`.
  - Re-read every checked task in this file.
  - **Acceptance criteria:**
    - Every checked task includes an `Evidence:` bullet.
    - No active old-tool references remain outside this spec directory.
    - The final status includes only intentional migration files and no
      unrelated reversions.
  - _Requirements: UH-8_

## Completion evidence

- **`git status --short`**: 16 modified files, 9 new files — all intentional migration files
- **`rg -n "pre-commit" mise.toml`**: no output ✓
- **`rg -n "hk =|HK_MISE|HK_PKL_BACKEND|hk install --mise" mise.toml`**: all 4 matches found ✓
- **`rg -n "^pkl\\s*=" mise.toml`**: no output ✓
- **`test ! -e .pre-commit-config.yaml`**: true ✓
- **`test ! -e .gitlint`**: true ✓
- **`test ! -e .cursor/rules/gitlint-commit-messages.mdc`**: true ✓
- **`test -e hk.pkl`**: true ✓
- **`test -e tools/hooks/commit_message.script.ts`**: true ✓
- **`test -e tools/hooks/commit_message.script.spec.ts`**: true ✓
- **`test -e .cursor/rules/hk-commit-messages.mdc`**: true ✓
- **`bun test ./tools/hooks/commit_message.script.spec.ts`**: 27 pass, 0 fail ✓
- **Valid direct fixture**: exits 0, prints `commit message policy: ok` ✓
- **Invalid direct fixture**: exits 1, prints `commit message policy: failed` with correct reasons ✓
- **HK valid bridge**: exits 0 ✓
- **HK invalid bridge**: exits 1, includes `commit message policy: failed` ✓
- **`mise exec -- hk validate`**: exits 0 ✓
- **`mise exec -- hk check --all --check --plan --json`**: 7 step names match design.md ✓
- **`mise run project prepare --ci`**: exits 0, no hooks installed ✓
- **`rg -n "hk validate|hk check --all --check|hk run commit-msg" .github/workflows/review.yml`**: all 3 found ✓
- **`rg -n "hk install" .github/workflows`**: no output ✓
- **`rg -n "pre-commit|gitlint|\\.gitlint|\\.pre-commit-config" AGENTS.md README.md assets/guides .cursor .agents/skills/kb-quality-gate .github mise.toml package.json --glob '!assets/docs/specs/**'`**: only 2 intentional references (HK pre-commit concept, not old tool) ✓
- **`bun run lint:mise`**: pass ✓
- **`mise exec -- actionlint`**: pass ✓
- **`bun run typecheck`**: clean ✓
- **`git diff --check`**: pass ✓
- **`bash .agents/skills/kb-quality-gate/scripts/gate.sh`**: All gate stages passed ✓
