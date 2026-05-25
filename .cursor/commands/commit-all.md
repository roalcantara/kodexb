---
description: Atomic commits for whole working tree; quality gate before each commit; HK commit-message policy after
---

# commit-all

Split **all uncommitted changes** (staged and unstaged) into **atomic commits** and commit each chunk with **Conventional Commits**, following **`assets/guides/GIT_COMMITS_GUIDE.md`**, **`hk.pkl`** (HK hooks), and **the kb quality gate** so only passing code is recorded.

## Before you start

1. Run `git status -sb` and `git diff` (unstaged + overview). Use `git diff --stat` for a quick map.
2. If there is nothing to commit, say so and stop.

## Analyse and chunk

1. **Group by intent**, not only by folder. Prefer one commit per topic; keep unrelated edits separate.
2. **Order chunks** so history reads well (config before formatting, dependencies last when sensible).
3. Present a short **plan**: list of chunks with paths + proposed first line `type(scope): Description` (**entire subject line ≤ 50 characters**, per HK `commit-message-policy`; subject must satisfy the HK conventional commit regex).

## Commit message rules

- Format: `type(optional-scope): Description` — **types** must match the HK `commit-message-policy` (this repo: `feat`, `fix`, `docs`, `style`, `ref`, `test`, `revert`, `chore`, `ci`, `build`). Use **`ref`** for refactors (**not** `refactor`).
- **Subject**: imperative; **capital first letter** of the description; no trailing period; obey HK commit-message-policy rules.
- **Body**: blank line after subject; lines ≤ **72** characters (guide); must satisfy HK `commit-message-policy` `body-min-length` and `body-max-line-length`. Explain **what** and **why**. Optional `Changes:` bullets.

## Execute (per chunk), in order

For **each** chunk:

1. **Stage only** that chunk: `git add -- <pathspec>...`
   Avoid `git add -A` unless the chunk is the entire remaining diff.

2. **Quality gate (required)** — run **before** `git commit` so the tree you are about to record is green:

   ```bash
   bash .agents/skills/app-quality-gate/scripts/gate.sh
   ```

   The gate runs on the **whole repository** (staged + unstaged). If **other chunks** still sit unstaged and would fail the gate, either:

   - **Temporarily stash** them: `git stash push --keep-index -m 'commit-all: pending chunks'`, run the gate, commit, then `git stash pop`; or
   - **Reorder** so the first commits contain only files that keep the full tree passing until the last chunk.

   If the gate **fails** after `stash push --keep-index`, fix or reorder work, then `git stash pop` when safe before retrying.

   Do **not** skip the gate for “small” or docs-only chunks unless a maintainer has agreed an exception (default: always run).

3. **Verify** the index matches the chunk: `git diff --cached --stat` (spot-check `git diff --cached` if needed).

4. **Commit** with full message (title + body).

5. **Verify commit message** with HK commit-msg hook:

   ```bash
   _f=$(mktemp)
   git log -1 --format=%B > "$_f"
   mise exec -- hk run commit-msg "$_f"
   rm -f "$_f"
   ```

   On failure: amend the message until HK passes.

6. If you used **stash --keep-index**, `git stash pop` before the next chunk (resolve conflicts if any).

Repeat until there is nothing left to commit for this command’s scope.

## Safety

- Do **not** `--amend` or rewrite **published** history unless the user explicitly asks (see `/commit-fixup` for repair flow on the last local commit).
- Do **not** commit secrets or ignored build artifacts.

## Done

Show `git log --oneline -n <N>` for the new commits and a one-line summary.

## Why gate + HK commit-message policy

**HK commit-message policy** only validates the **message**. **Quality gate** validates **code** (lint, tests, smoke). Running message validation alone is insufficient and is how broken commits slip through.
