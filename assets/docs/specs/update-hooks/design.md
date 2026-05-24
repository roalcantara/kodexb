<!-- markdownlint-disable-file -->
# Update hooks — Design

## Overview

HK becomes the repository's Git lifecycle runner. Mise remains the source of
truth for tool versions and project commands. The kb quality gate remains the
source of truth for full repository validation.

The migration intentionally does not use HK's built-in
`check-conventional-commit` as the only commit-message validator. That utility
is useful, but its default policy allows types this repo rejects and does not
encode the current body-length, title-length, capital-description, generated
commit, release title, and Dependabot skip behavior. A local Bun validator is
the deterministic replacement for `.gitlint`.

## Current Hook Map

```txt
git commit
  -> pre-commit commit-msg hook
      -> gitlint v0.19.1
          -> .gitlint

mise run project prepare
  -> bun install
  -> pre-commit install --hook-type commit-msg

.cursor/commands/commit-*
  -> bash .agents/skills/kb-quality-gate/scripts/gate.sh
  -> git commit
  -> pre-commit run gitlint --hook-stage commit-msg --commit-msg-filename <tmp>
```

Important implication: there is no active `pre-commit` file-quality suite in
`.pre-commit-config.yaml`. The current Python-backed hook path exists only to
run `gitlint`.

## Target Hook Map

```txt
git commit
  -> hk run pre-commit
      -> HK native hygiene checks on staged files
  -> hk run commit-msg <commit-msg-file>
      -> bun tools/hooks/commit_message.script.ts <commit-msg-file>

git push
  -> hk run pre-push
      -> bash .agents/skills/kb-quality-gate/scripts/gate.sh

mise run project prepare
  -> bun install
  -> hk install --mise

.cursor/commands/commit-*
  -> bash .agents/skills/kb-quality-gate/scripts/gate.sh
  -> git commit
  -> hk run commit-msg <tmp>
```

CI validates HK config and behavior directly with `hk validate`, `hk check`,
and `hk run commit-msg`. CI does not install hooks.

## Tooling Architecture

`mise.toml` changes:

- Remove `pre-commit = "4.4"`.
- Add `hk = "1.45.0"`.
- Do not add `pkl = "latest"`.
- Add `HK_MISE = "1"` under `[env]` so HK hooks run through Mise-managed tools.
- Add `HK_PKL_BACKEND = "pklr"` under `[env]` so HK uses its built-in Pkl
  evaluator and the repo does not need the standalone Pkl CLI.
- Change `project prepare` so non-CI setup runs `hk install --mise`.
- Do not add a new root public Mise task for hooks.

`hk.pkl` changes:

- Commit `hk.pkl` at the repo root.
- Amend the HK `Config.pkl` package matching the pinned HK version.
- Import HK `Builtins.pkl` only for builtins that are actually used.
- Define hooks for `pre-commit`, `commit-msg`, `pre-push`, and `check`.
- Keep full repository quality in `pre-push`; keep fast staged-file hygiene in
  `pre-commit`.

## HK Step Set

The first migration must include exactly these active HK steps.

```txt
pre-commit:
  trailing-whitespace
  end-of-file-fixer
  mixed-line-ending
  check-merge-conflict
  detect-private-key
  check-case-conflict
  check-added-large-files
  no-commit-to-branch

commit-msg:
  commit-message-policy

pre-push:
  quality-gate

check:
  trailing-whitespace
  end-of-file-fixer
  mixed-line-ending
  check-merge-conflict
  detect-private-key
  check-case-conflict
  check-added-large-files
```

`no-commit-to-branch` protects `main` and `master`. It belongs only in
`pre-commit`, not `check`, so `hk check --all --check` remains usable on any
branch.

`quality-gate` is exclusive because it runs a full sequential script and should
not compete with other hook steps.

## Commit Policy Script

Create:

```txt
tools/hooks/commit_message.script.ts
tools/hooks/commit_message.script.spec.ts
```

The script is the machine-readable replacement for `.gitlint`. It accepts one
argument: a path to a commit-message file.

The script emits stable output:

```txt
commit message policy: ok
```

```txt
commit message policy: failed
- subject must be 5-50 characters
- body is required and must contain at least 20 characters
```

```txt
commit message policy: skipped generated git subject
```

```txt
commit message policy: skipped dependabot author
```

The script detects Dependabot through `KB_HOOK_AUTHOR_NAME`, then
`GIT_AUTHOR_NAME`, then `git var GIT_AUTHOR_IDENT`. Tests use
`KB_HOOK_AUTHOR_NAME` so they are deterministic and do not depend on local Git
identity.

Policy details:

- Allowed types: `feat`, `fix`, `docs`, `style`, `ref`, `test`, `revert`,
  `chore`, `ci`, `build`.
- Scope is optional and must be wrapped in parentheses if present.
- Breaking-change marker `!` is allowed before `:`.
- Description must begin with an uppercase ASCII letter.
- `refactor` is not an allowed type; use `ref`.
- Subject is normally 5-50 characters.
- Subject must not contain `wip` as a word, case-insensitively.
- Subject must not end with `.`.
- Body must exist, be separated from the subject by a blank line, and contain at
  least 20 non-whitespace characters.
- Body lines must be 72 characters or less.
- Generated Git subjects beginning `Merge `, `Revert `, `fixup! `, or
  `squash! ` are skipped.
- Dependabot author names are skipped.
- `Release ` subjects relax only the 50-character subject length rule. They do
  not bypass conventional format or body rules.

## Release-It Compatibility

The current release-it subject is:

```txt
chore(release): v${version} [skip ci]
```

That does not satisfy the capital-description rule. The migration updates it to
a full message:

```txt
chore(release): Release v${version} [skip ci]

Prepare the release commit so changelog and version stay aligned.
```

The policy tests must include the rendered version
`chore(release): Release v0.0.0-test [skip ci]` with the body above.

## Documentation Architecture

Replace old-tool references in active guidance:

- `README.md`: list HK as the Git hook manager and commit-message validator.
- `AGENTS.md`: replace gitlint references in commit command summaries.
- `.cursor/commands/commit-all.md`: use `hk run commit-msg`.
- `.cursor/commands/commit-staged.md`: use `hk run commit-msg`.
- `.cursor/commands/commit-fixup.md`: use `hk run commit-msg`.
- `.cursor/rules/gitlint-commit-messages.mdc`: replace with
  `.cursor/rules/hk-commit-messages.mdc`.
- `assets/guides/GIT_COMMITS_GUIDE.md`: name the HK/Bun validator path.
- `assets/guides/GIT_GUIDE.md`: remove `.gitlint` as the current policy
  reference.
- `assets/guides/DoD.md`: replace pre-commit/gitlint hook wording with HK.
- `.agents/skills/kb-quality-gate/SKILL.md`: replace gitlint wording with HK.
- `.agents/skills/kb-quality-gate/scripts/gate_policy.sh`: update the comment
  that says staged diff exists for pre-commit.

Historical specs under `assets/docs/specs/**` may mention the old tools as
history. Active guidance must not.

## Pkl Backend

Use HK's built-in `pklr` backend for the first implementation:

```toml
[env]
HK_MISE = "1"
HK_PKL_BACKEND = "pklr"
```

The HK docs describe `pklr` as experimental, but also state that it removes the
need to install the standalone Pkl CLI and is intended to become the default.
This project should prefer `pklr` because the planned `hk.pkl` is deliberately
small and only uses normal HK configuration, imports, builtins, mappings, and
steps. If validation exposes a `pklr` feature gap, the implementer must stop and
record the exact HK/Pkl error instead of silently adding `pkl`.

## CI Architecture

The review workflow gets a hook-validation section:

```sh
mise exec -- hk validate
mise exec -- hk check --all --check
tmp="$(mktemp)"
git log -1 --format=%B > "$tmp"
mise exec -- hk run commit-msg "$tmp"
rm -f "$tmp"
```

This validates HK without installing hooks in CI. The workflow still runs the
existing lint, typecheck, test, and smoke jobs through current canonical
commands.

## Validation Strategy

The migration is complete only when all layers pass:

1. Direct policy tests:
   `bun test tools/hooks/commit_message.script.spec.ts`
2. Direct valid/invalid fixture checks against
   `tools/hooks/commit_message.script.ts`
3. HK config validation:
   `mise exec -- hk validate`
4. HK plan validation:
   `mise exec -- hk check --all --check --plan --json`
5. HK full check:
   `mise exec -- hk check --all --check`
6. HK commit-msg bridge:
   `mise exec -- hk run commit-msg <valid-message-file>`
7. Workflow validation:
   `mise exec -- actionlint`
8. Current repo gate:
   `bash .agents/skills/kb-quality-gate/scripts/gate.sh`
9. Diff hygiene:
   `git diff --check`

## Decisions

### Decision: Use a local Bun commit-message validator

**Context:** `.gitlint` contains project-specific behavior that HK's generic
conventional-commit utility does not fully express.

**Options considered:**

1. Use `hk util check-conventional-commit` only.
2. Keep gitlint and run it from HK.
3. Replace gitlint with a local Bun validator.

**Decision:** Replace gitlint with a local Bun validator.

**Rationale:** This removes both old tools while preserving the exact policy.
It also makes the policy testable with `bun:test` and keeps it in the repo's
primary runtime.

### Decision: Install HK through `project prepare`

**Context:** The current project setup command already installs dependencies
and commit hooks.

**Decision:** Keep hook setup in `mise run project prepare`, replacing
`pre-commit install --hook-type commit-msg` with `hk install --mise`.

**Rationale:** This preserves the existing developer workflow while switching
the implementation.

### Decision: Use HK for lifecycle hooks, not as the full quality gate engine

**Context:** The kb quality gate is already explicit, ordered, and project
specific.

**Decision:** HK runs fast pre-commit hygiene, commit-message validation, and
pre-push quality gate orchestration. It does not replace `gate.sh`.

**Rationale:** This gets HK's speed and lifecycle integration without weakening
the existing quality contract.

### Decision: Use repo-local install for project setup

**Context:** HK recommends global hooks for Git 2.54+, but a repo setup command
must work deterministically for contributors.

**Decision:** `project prepare` runs `hk install --mise`. Docs may mention
`hk install --global` as an optional user preference, but acceptance relies on
the repo-local setup path.

**Rationale:** The implementation must not mutate the user's global Git config
without explicit request.

### Decision: Use HK's `pklr` backend

**Context:** HK supports a built-in Pkl evaluator named `pklr` through
`HK_PKL_BACKEND=pklr`. The docs state that this removes the standalone Pkl CLI
requirement and is expected to become the default backend.

**Options considered:**

1. Install the standalone Pkl CLI with Mise.
2. Use `HK_PKL_BACKEND=pklr`.

**Decision:** Use `HK_PKL_BACKEND=pklr` and do not add `pkl` to Mise tools.

**Rationale:** This keeps the migration smaller and more aligned with HK's
direction. The planned `hk.pkl` is simple enough that `pklr` is a reasonable
default, and `hk validate` plus `hk check --all --check --plan --json` will
catch any backend incompatibility before the migration is accepted.
