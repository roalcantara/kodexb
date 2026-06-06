<!-- markdownlint-disable-file -->
# Update hooks — Handoff

## Copy-paste Prompt

```txt
You are implementing the SDD spec in /Users/roalcantara/Work/bun/app/assets/docs/archive/update-hooks/.

Read these files first, in this order:
1. /Users/roalcantara/Work/bun/app/AGENTS.md
2. /Users/roalcantara/Work/bun/app/assets/docs/archive/update-hooks/requirements.md
3. /Users/roalcantara/Work/bun/app/assets/docs/archive/update-hooks/design.md
4. /Users/roalcantara/Work/bun/app/assets/docs/archive/update-hooks/tasks.md
5. /Users/roalcantara/Work/bun/app/.agents/skills/app-quality-gate/SKILL.md

Implement exactly the plan in tasks.md. Do not redesign it. Do not keep pre-commit, gitlint, .gitlint, or .pre-commit-config.yaml as active tooling. Do not add deprecated wrappers. Do not add a new top-level public Mise task for hooks. Do not install global HK hooks. Use repo-local `hk install --mise` through `mise run project prepare`.

The work is done only when all acceptance criteria below pass and every checked task in tasks.md includes an Evidence bullet with changed files and exact commands.

Required implementation outcomes:
1. `pre-commit = "4.4"` is removed from mise.toml.
2. `hk = "1.45.0"` is added to mise.toml.
3. `pkl = "latest"` is not added to mise.toml.
4. `HK_MISE = "1"` is configured in mise.toml.
5. `HK_PKL_BACKEND = "pklr"` is configured in mise.toml.
6. `mise run project prepare` runs `hk install --mise` outside CI and does not install hooks in CI mode.
7. `.pre-commit-config.yaml` is deleted.
8. `.gitlint` is deleted.
9. `hk.pkl` exists at the repo root.
10. `tools/hooks/commit_message.script.ts` exists.
11. `tools/hooks/commit_message.script.spec.ts` exists.
12. `.cursor/rules/gitlint-commit-messages.mdc` is deleted.
13. `.cursor/rules/hk-commit-messages.mdc` exists.
14. `.github/workflows/review.yml` validates HK with `hk validate`, `hk check --all --check`, and `hk run commit-msg`.

Required HK step contract:
pre-commit must contain exactly these intended policy steps:
- trailing-whitespace
- end-of-file-fixer
- mixed-line-ending
- check-merge-conflict
- detect-private-key
- check-case-conflict
- check-added-large-files
- no-commit-to-branch

commit-msg must contain:
- commit-message-policy

pre-push must contain:
- quality-gate

check must contain:
- trailing-whitespace
- end-of-file-fixer
- mixed-line-ending
- check-merge-conflict
- detect-private-key
- check-case-conflict
- check-added-large-files

The commit-message policy script must preserve the old .gitlint policy:
- Allowed types are exactly: feat, fix, docs, style, ref, test, revert, chore, ci, build.
- `refactor` is invalid. Use `ref`.
- Subject regex is exactly: ^(feat|fix|docs|style|ref|test|revert|chore|ci|build)(\([^)]*\))?(!)?: [A-Z].*
- Normal subject length is 5-50 characters.
- Subject must not contain `wip` as a word, case-insensitively.
- Subject must not end with a period.
- Body is required and must contain at least 20 non-whitespace characters.
- Body lines must be 72 characters or less.
- Subjects starting with `Merge `, `Revert `, `fixup! `, or `squash! ` are skipped.
- Author names containing `dependabot`, case-insensitively, are skipped.
- Subjects starting with `Release ` relax only the 50-character subject length rule, not any other rule.

The policy script must emit these exact stable outputs:
- Valid normal message: `commit message policy: ok`
- Missing argument: `commit message policy: missing message file`
- Generated Git subject skip: `commit message policy: skipped generated git subject`
- Dependabot author skip: `commit message policy: skipped dependabot author`
- Invalid message first line: `commit message policy: failed`
- Invalid message reason lines: `- <reason>`

Use this exact invalid fixture expectation:
Input file:
docs(hooks): add HK migration plan

Expected stdout:
commit message policy: failed
- subject must match type(scope): Description with an allowed type and capitalized description
- body is required and must contain at least 20 characters

Required release-it commit message:
chore(release): Release v${version} [skip ci]

Prepare the release commit so changelog and version stay aligned.

Required validation commands:
1. `rg -n "pre-commit" mise.toml` prints no output.
2. `rg -n "hk =|HK_MISE|HK_PKL_BACKEND|hk install --mise" mise.toml` prints at least one match for each of `hk = "1.45.0"`, `HK_MISE = "1"`, `HK_PKL_BACKEND = "pklr"`, and `hk install --mise`.
3. `rg -n "^pkl\\s*=" mise.toml` prints no output.
4. `test ! -e .pre-commit-config.yaml`
5. `test ! -e .gitlint`
6. `test ! -e .cursor/rules/gitlint-commit-messages.mdc`
7. `test -e hk.pkl`
8. `test -e tools/hooks/commit_message.script.ts`
9. `test -e tools/hooks/commit_message.script.spec.ts`
10. `test -e .cursor/rules/hk-commit-messages.mdc`
11. `bun test tools/hooks/commit_message.script.spec.ts`
12. Direct valid fixture:
    ```
    tmp="$(mktemp)"
    printf '%s\n\n%s\n' \
      'docs(hooks): Add HK migration plan' \
      'Explain why HK replaces the old commit hook stack.' > "$tmp"
    bun tools/hooks/commit_message.script.ts "$tmp"
    rm -f "$tmp"
    ```
    Expected exact stdout: `commit message policy: ok`
13. Direct invalid fixture:
    ```
    tmp="$(mktemp)"
    printf '%s\n' 'docs(hooks): add HK migration plan' > "$tmp"
    bun tools/hooks/commit_message.script.ts "$tmp"
    rm -f "$tmp"
    ```
    Expected non-zero exit and exact stdout:
    ```
    commit message policy: failed
    - subject must match type(scope): Description with an allowed type and capitalized description
    - body is required and must contain at least 20 characters
    ```
14. HK valid bridge:
    ```
    tmp="$(mktemp)"
    printf '%s\n\n%s\n' \
      'docs(hooks): Add HK migration plan' \
      'Explain why HK replaces the old commit hook stack.' > "$tmp"
    mise exec -- hk run commit-msg "$tmp"
    rm -f "$tmp"
    ```
    Expected exit: 0.
15. HK invalid bridge:
    ```
    tmp="$(mktemp)"
    printf '%s\n' 'docs(hooks): add HK migration plan' > "$tmp"
    mise exec -- hk run commit-msg "$tmp"
    status=$?
    rm -f "$tmp"
    test "$status" -ne 0
    ```
    Expected result: command proves the invalid HK bridge exits non-zero.
16. `mise exec -- hk validate`
17. `mise exec -- hk check --all --check --plan --json`
18. `mise exec -- hk check --all --check`
19. `mise run project prepare --ci`
20. `rg -n "hk validate|hk check --all --check|hk run commit-msg" .github/workflows/review.yml`
21. `rg -n "hk install" .github/workflows` prints no output.
22. `rg -n "pre-commit|gitlint|\\.gitlint|\\.pre-commit-config" AGENTS.md README.md assets/guides .cursor .agents/skills/app-quality-gate .github mise.toml package.json --glob '!assets/docs/archive/**'` prints no output.
23. `bun run lint:mise`
24. `mise exec -- actionlint`
25. `bun run typecheck`
26. `git diff --check`
27. `bash .agents/skills/app-quality-gate/scripts/gate.sh`

When you finish, summarize:
- Files changed.
- Old tooling removed.
- New HK commands added.
- Exact validation command results.
- Any remaining risks.

Do not mark phases complete just because files were edited. Mark them complete only after the corresponding acceptance criteria pass.
```

## Notes for Reviewer

The implementation should be rejected if:

- Any active non-spec file still instructs users to run `pre-commit` or
  `gitlint`.
- `.gitlint` or `.pre-commit-config.yaml` remains.
- The HK commit-message script allows `refactor`.
- The HK commit-message script accepts a missing body.
- The invalid fixture output differs from the prompt.
- CI installs hooks instead of validating HK directly.
- `tasks.md` checkboxes are marked complete without evidence bullets.
