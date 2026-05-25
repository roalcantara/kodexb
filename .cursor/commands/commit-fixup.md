---
description: Gate until green before amend; HK commit-message policy after; no post-amend gate
---

# commit-fixup

**Repair the last local commit** when the quality gate fails on **`HEAD`** (or you forgot to run it before committing). **Fix** issues, run **`gate.sh` until it passes** on the tree you are about to record, **stage** fixups, **`git commit --amend`**, then **HK commit-message policy** the message. Do **not** run the quality gate again **after** a successful amend when the working tree matches the new commit (that duplicate run does not change anything you can act on).

## When to use

- `/commit-all` or `/commit-staged` landed a red **`HEAD`** (lint, tests, typecheck, smoke).
- You want one commit to stay **one** logical unit: fold fixes into it instead of adding a noisy “fix oops” follow-up.

## Safety (read first)

1. **Published commits**
   If `HEAD` is already **on the remote tip** (branch tracks upstream and `git rev-parse HEAD` equals `git rev-parse @{u}` after a successful push), **`git commit --amend` rewrites published history**. Stop and ask the user, unless they explicitly approve (for example: **`AMEND PUSHED COMMIT: yes`**).
   If `HEAD` is **ahead** of `@{u}` (unpushed commits), amending the top commit is normal local cleanup.

2. Do **not** drop or weaken quality rules to green the gate; **fix the code** (see `AGENTS.md` / quality audit docs).

## Execute

1. `git status -sb` and `git log -1 --oneline`. Confirm there is a **last commit** to amend and that amend policy above allows it.

2. **Run the quality gate** on the current tree:

   ```bash
   bash .agents/skills/app-quality-gate/scripts/gate.sh
   ```

3. **While the gate fails:** apply fixes (stage 0 already runs `bun run lint:fix`; fix the rest manually), **`git add`** the touched paths, then **run `gate.sh` again**. Repeat until the gate passes or you are blocked.

4. If the gate passes and **`git diff HEAD`** is empty (no working-tree or index changes relative to **`HEAD`**), say there is nothing to fold into the commit and stop.

5. **Amend** into the previous commit, preserving the message unless the user requested a reword:

   ```bash
   git commit --amend --no-edit
   ```

   If the message must change, amend with a new full message that still passes HK commit-message policy.

6. **HK commit-message policy** the amended message:

   ```bash
   _f=$(mktemp)
   git log -1 --format=%B > "$_f"
   mise exec -- hk run commit-msg "$_f"
   rm -f "$_f"
   ```

   On failure: `git commit --amend` with a corrected message until HK passes.

## Done

Show `git log -1` (oneline + stat if useful) and `git status -sb`. Remind the user: if they already **pushed** the old `HEAD`, they need a **force-with-lease** push only after explicit approval.

## Note on `fixup!` commits

This command uses **`git commit --amend`**, not a separate `fixup!` commit. HK commit-message policy may ignore `fixup!` / `squash!` titles by design; here we keep **one** amended commit with a normal Conventional subject.
