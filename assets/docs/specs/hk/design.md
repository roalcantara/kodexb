<!-- markdownlint-disable-file -->
# HK quality orchestration - Design

## Overview

The design keeps the current quality stack intact and moves orchestration into
HK incrementally. HK becomes the place that answers "which checks run in this
context?" Tool configs remain the place that answer "what does this tool
enforce?"

The implementation should start by adding profile-shaped HK steps that mirror
current commands. It should then add conditional execution for checks that can
be safely scoped by changed files, with `actionlint` as the first concrete
example. Only after parity is proven should any existing shell orchestration be
collapsed.

## Architecture

```txt
developer / CI command
        |
        v
HK hook or check profile
        |
        +-- fast hygiene builtins
        +-- conditional file-scoped builtins
        +-- custom repo-policy steps
        +-- delegated app-specific gate stages
        |
        v
existing tool configs and scripts
```

The architecture has three layers:

1. **HK orchestration:** profiles, step inclusion, globs, conditions, order,
   parallelism, fix/stash behavior, and diagnostics.
2. **Tool policy:** `biome.jsonc`, `knip.jsonc`, `.dependency-cruiser.cjs`,
   `.jscpd.json`, `.ls-lint.yml`, `sgconfig.yml`, `.hadolint.yaml`,
   `tsconfig.json`, and app-specific scripts.
3. **Publication/reporting:** GitHub Actions uploads reports, writes summaries,
   manages caches, and performs workflow-specific artifact actions.

## Profile model

### `commit`

The commit profile is fast and developer-facing. It should include current
pre-commit hygiene plus cheap additions after validation.

Candidate steps:

- `trailing_whitespace`
- `newlines`
- `mixed_line_ending`
- `check_merge_conflict`
- `detect_private_key`
- `check_case_conflict`
- `check_added_large_files`
- `no_commit_to_branch`
- `check_executables_have_shebangs`
- `check_symlinks`
- optional `gitleaks` after baseline

Do not put full tests, build, dependency-cruiser, or jscpd in this profile by
default.

### `pr`

The PR profile focuses on changed files. It is the main place to use HK's file
selection and conditional execution.

Candidate command:

```sh
mise exec -- hk check --pr --profile pr --plan
```

Candidate steps:

- all cheap commit checks
- `actionlint` only when workflows changed
- `hadolint` only when `Dockerfile` or related Docker lint config changed
- `tombi` only when `mise.toml` changed
- Biome for changed TS/TSX/JSON/Markdown files if strict flags are preserved
- custom ast-grep if scoped behavior remains equivalent

### `ci`

The CI profile is for CI-oriented whole-branch validation and report
generation. It should not replace workflow artifact upload. It should produce
the same report files that current workflow steps upload.

Candidate steps:

- `hk validate`
- HEAD commit message policy
- `actionlint`
- `gitleaks` baseline or required mode
- Biome with CI reporter
- knip compact report, preserving current non-failing policy unless approved
- dependency-cruiser JSON report
- jscpd JSON and console report
- ls-lint report
- hadolint report
- ast-grep report
- tombi/mise config checks
- TypeScript

### `full`

The full profile mirrors the current quality gate. It can initially delegate to
existing commands rather than reimplementing every stage as separate HK steps.

Required sequence:

1. autofix
2. policy
3. lint/typecheck
4. Bun tests
5. preview-server smoke
6. build smoke on supported hosts

`gate.sh` remains the stable public entry point. The implementation may make
`gate.sh` call HK `full`, but only after proving equivalent behavior.

### `slow`

The slow profile is for useful checks that should not block every commit.

Candidate steps:

- `lychee`
- `zizmor`
- full-history or expanded `gitleaks`
- container structure tests
- build smoke
- docs spelling/linting if adopted

## Conditional execution design

HK gives two preferred mechanisms for "only run this when relevant":

1. `glob` or `types`, which skips the step when no selected files match.
2. `condition` or `step_condition`, which evaluates an expression over the HK
   context, including the git status object.

For file-scoped tools, prefer `glob` first because it is simpler and uses HK's
selected file set.

Example shape for workflow linting:

```pkl
["actionlint"] = (Builtins.actionlint) {
    glob = List(".github/workflows/*.yml", ".github/workflows/*.yaml")
    profiles = List("pr", "ci")
}
```

With `hk check --pr --profile pr`, this runs only when workflow files are part
of the PR-selected file set. With `hk check --all --profile ci`, it runs
whenever workflow files exist, which is a deliberate whole-repo CI policy.

Use `step_condition` when the step should run based on repository state that is
not represented by the files passed to the command. HK's docs expose
`git.staged_files`, `git.unstaged_files`, `git.untracked_files`,
`git.modified_files`, and staged/unstaged classification lists to conditions.

## Step implementation strategy

### Builtins that can be used directly

Use direct HK builtins only when their defaults match current policy:

- current hygiene builtins
- `actionlint`
- `hadolint`, if command flags and file handling match
- cheap file hygiene additions such as `check_symlinks`

### Builtins that need overrides or custom commands

Use custom commands or builtin overrides when defaults differ:

- Biome must preserve strict warning-as-error behavior.
- knip must preserve current non-failing behavior.
- TypeScript should use the repo's Bun/npm command shape.
- gitleaks must start in baseline-safe mode.
- markdown, YAML, spelling, and link checks need scoped globs and allowlists
  before they can be blocking.

### Tools with no HK builtin

Keep custom HK steps for:

- dependency-cruiser
- jscpd
- ls-lint
- ast-grep
- Bun test
- preview smoke
- Electrobun build smoke
- container structure tests if exposed through HK

## CI design

CI should adopt HK in two phases.

First, add a parity step or job that runs the HK `ci` profile without removing
existing lint/test/report jobs. This gives a direct comparison against the
current workflow.

Second, after parity, simplify the workflow so GitHub Actions owns setup,
caches, summaries, and artifacts, while HK owns quality command composition.

Report paths that existing workflow steps upload should remain stable:

- `tmp/reports/linters`
- `tmp/reports/tests`
- `tmp/reports/cst`

## Data and config changes

Expected implementation files:

- `hk.pkl`
- `mise.toml`
- `package.json`, only if aliases need to point at HK profiles
- `.github/workflows/review.yml`, only for CI parity/adoption
- `.agents/skills/app-quality-gate/scripts/gate.sh`, only if delegating to HK
- `assets/docs/specs/hk/*`
- possible docs in `assets/guides/` if current command guidance changes

No source files under `src/` are expected for the orchestration pass.

## Error handling

- If an HK builtin weakens current behavior, use a custom step instead.
- If a new builtin produces noisy findings, keep it in baseline/report-only
  mode and record the findings before making it blocking.
- If HK report output cannot preserve current CI artifacts, keep the existing
  CI job and document the gap.
- If a conditional step unexpectedly runs or skips, use `hk check --plan`,
  `hk check --why <step>`, and representative changed-file scenarios before
  changing policy.
- If `gate.sh` parity cannot be proven, keep `gate.sh` as the source of truth
  and defer full-profile delegation.

## Testing strategy

### Static validation

Run:

```sh
mise exec -- hk validate
git diff --check
```

### Plan validation

Run representative plans:

```sh
mise exec -- hk check --plan
mise exec -- hk check --all --profile ci --plan
mise exec -- hk check --pr --profile pr --plan
```

Create at least one temporary workflow-file change during implementation to
prove `actionlint` appears in the PR or staged-file plan, then remove or keep
that change only if it belongs to the task.

### Step validation

Run focused steps or profiles as implemented:

```sh
mise exec -- hk check --all --profile ci --check
mise exec -- hk check --pr --profile pr --check
mise exec -- hk run commit-msg <tmp-message-file>
```

### Gate validation

Before calling implementation complete, run:

```sh
bash .agents/skills/app-quality-gate/scripts/gate.sh
```

If the full gate cannot be run because of environment limitations, record the
blocker and the narrower checks that did run.

## Decisions

### Decision: HK owns orchestration, not policy

**Context:** The current repo quality stack is strict and project-specific.
HK builtins can simplify execution but may have weaker defaults than the repo's
current commands.

**Decision:** Keep tool policy in existing config files and scripts. Use HK to
select, sequence, and invoke those tools.

**Rationale:** This gets the speed and consistency benefits of HK without
silently weakening enforcement.

### Decision: Use `glob` before `step_condition`

**Context:** HK skips file-scoped steps when no selected files match the step
glob. The docs also expose `step_condition` and git status data for more
advanced cases.

**Decision:** Prefer `glob` or `types` for normal changed-file gating. Use
`step_condition` only when the trigger cannot be represented as selected-file
matching.

**Rationale:** Globs are simpler, easier to inspect in `hk check --plan`, and
less likely to drift from how HK batches files.

### Decision: Baseline `gitleaks` before blocking commits

**Context:** `gitleaks` is the most valuable new builtin candidate, but secret
scanners often find historical or fixture-like strings that need triage.

**Decision:** Introduce `gitleaks` in CI/PR baseline mode first. Promote it to
commit blocking only after false positives and runtime are understood.

**Rationale:** This improves security coverage without turning first adoption
into a noisy developer workflow regression.

### Decision: Keep `gate.sh` stable

**Context:** AGENTS.md, Cursor commands, and project skills already point to
`bash .agents/skills/app-quality-gate/scripts/gate.sh`.

**Decision:** Preserve that path. If HK takes over the internals, `gate.sh`
should delegate to HK rather than disappear.

**Rationale:** Stable entry points matter more than reducing one wrapper file.
