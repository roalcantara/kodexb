---
description: One commit from staged files; quality gate before commit; HK commit-message policy after
---

# commit-staged

Create **one** Conventional Commit from **what is already staged** (do not stage new paths unless fixing gate failures). Message and body must pass **HK `commit-message-policy`**; **code must pass the kb quality gate** before the commit is created.

## Before you start

1. Run `git status -sb` and `git diff --cached --stat`.
2. If **nothing is staged**, say so and stop.

## Plan

1. Summarize what the staged diff represents (one topic = one commit).
2. Propose the full first line `type(scope): Description` (**entire subject line ≤ 50 characters**, per HK `commit-message-policy`; types must match the HK policy: `feat`, `fix`, `docs`, `style`, `ref`, `test`, `revert`, `chore`, `ci`, `build`).
3. Draft a body that satisfies HK `commit-message-policy` body rules (min length, max line length, capitalized description on the subject).

## Execute

1. **Quality gate (required)** — run **before** `git commit`:

   ```bash
   bash .agents/skills/app-quality-gate/scripts/gate.sh
   ```

   If **unstaged** changes exist and could distract or fail tools, prefer isolating staged work:

   ```bash
   git stash push --keep-index -m 'commit-staged: unstaged WIP'
   bash .agents/skills/app-quality-gate/scripts/gate.sh
   ```

   After a successful commit, `git stash pop` if you stashed.

   If the **gate fails**, fix the issues or adjust staging, then re-run the gate. If you stashed, run `git stash pop` when you are done troubleshooting (or leave the stash entry if you need to inspect).

2. Confirm staged set: `git diff --cached --stat`.

3. **Commit** with the full message (subject + body).

4. **HK commit-message policy** the result:

   ```bash
   _f=$(mktemp)
   git log -1 --format=%B > "$_f"
   mise exec -- hk run commit-msg "$_f"
   rm -f "$_f"
   ```

   On failure: `git commit --amend` until HK passes.

## Safety

- Do not commit secrets or generated artifacts that should stay ignored.
- Do **not** amend already-pushed commits unless the user explicitly requests it.

## Done

Show `git log -1 --oneline` and confirm `git status -sb`.
