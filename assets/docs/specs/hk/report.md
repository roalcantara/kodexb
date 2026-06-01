<!-- markdownlint-disable-file -->
# HK quality orchestration report

## Summary

HK is already present in this repository, but it is currently used as a narrow
git-hook layer rather than as the main quality orchestration layer.

The strongest opportunity is not replacing Biome, knip, dependency-cruiser,
jscpd, ls-lint, ast-grep, TypeScript, Bun test, or the preview/build smoke
checks. Those tools encode project-specific policy and should remain. The
opportunity is to let HK own more of the execution model: profile selection,
staged-file fast paths, branch/PR checks, local/CI parity, parallel execution,
hook wiring, and diagnostic planning.

Recommendation: proceed to SDD for a staged HK orchestration migration. The
first implementation should be conservative: keep the existing tool configs and
quality policy intact, add HK profiles that mirror current local and CI flows,
then gradually collapse duplicated shell orchestration only after the HK profile
output proves equivalent.

## Sources

- Official HK about page: https://hk.jdx.dev/about.html
- Official HK builtins reference: https://hk.jdx.dev/builtins.html
- Official HK configuration reference: https://hk.jdx.dev/configuration.html
- Official HK hooks reference: https://hk.jdx.dev/hooks.html
- Official `hk check` reference: https://hk.jdx.dev/cli/check.html
- Local HK skill: `/Users/roalcantara/.agents/skills/hk/SKILL.md`
- Local repo files inspected: `hk.pkl`, `mise.toml`, `package.json`,
  `.github/workflows/review.yml`,
  `.agents/skills/app-quality-gate/scripts/gate.sh`,
  `.agents/skills/app-quality-gate/SKILL.md`

## Current State

### HK in this repo today

`hk.pkl` currently defines:

- `pre-commit`: fast hygiene checks, `fix = true`, `stash = "git"`.
- `commit-msg`: custom commit policy via
  `bun tools/hooks/commit_message.script.ts {{commit_msg_file}}`.
- `pre-push`: a single `quality-gate` step that shells out to
  `bash .agents/skills/app-quality-gate/scripts/gate.sh`.
- `check`: the same fast hygiene checks minus `no_commit_to_branch`.

Current `hk check --all --check --plan` only plans these lightweight checks:

- `trailing_whitespace`
- `end-of-file-fixer`
- `mixed_line_ending`
- `check_merge_conflict`
- `detect_private_key`
- `check_case_conflict`
- `check_added_large_files`

It does not currently plan the substantive quality stack: Biome, TypeScript,
knip, dependency-cruiser, jscpd, ls-lint, hadolint, ast-grep, tests, preview
server smoke, or build smoke.

### Quality orchestration today

The repo already has a sophisticated local/CI quality system:

- `package.json` defines script-level entry points for linting, typecheck,
  tests, and build.
- `mise.toml` defines high-level tasks for project setup, CI, tests, linting,
  performance, skills, and Docker/CST flows.
- `.agents/skills/app-quality-gate/scripts/gate.sh` runs:
  - autofix
  - policy checks
  - full lint plus typecheck
  - Bun tests
  - preview-server smoke
  - macOS build smoke when available
- `.github/workflows/review.yml` has separate CI jobs for:
  - HK validation and hook-policy checks
  - lint chain
  - test suite
  - container structure tests
  - preview/build smoke

This gives good coverage, but the execution rules are spread across several
places. HK can reduce that spread if we treat it as an orchestrator.

## Relevant HK Capabilities

### Builtins

HK exposes 90+ builtin linters and formatters through `Builtins`. The official
reference documents direct use in `hk.pkl` and shows that builtins can be
customized with overrides such as custom globs or batching.

This matters because we can use standard HK step definitions for tools where
the default behavior matches us, while keeping custom commands where the repo
has intentional policy differences.

### Parallelism with read/write locking

HK's hook model distinguishes check and fix commands. Check commands can run in
parallel. Fix commands acquire write locks around matching files, and HK can
stash unstaged changes when running fix hooks. This directly targets the class
of problems that lint-staged and naive shell parallelism tend to create:
formatters and fixers racing on the same file or accidentally staging
unstaged edits.

For this repo, this is most useful for:

- pre-commit autofix paths
- staged Biome formatting/lint fixes
- staged ast-grep rewrites if we choose to expose them in HK
- future markdown/YAML/package-json fixers

### Profiles

HK profiles can be enabled by CLI flags, environment variables, Git config, or
Pkl config. Individual steps can opt into profiles, and profiles can be
explicitly disabled with `!profile`.

This maps cleanly to this repo's needs:

- `commit`: fast checks safe for every commit.
- `pr`: checks changed in the current PR/branch.
- `ci`: CI-oriented checks and reporters.
- `full`: whole-repo gate, matching the current final quality gate.
- `slow`: expensive checks like full build smoke, link checking, or future
  security scanners.

### `hk check` and diagnostics

`hk check` can run on all files, specific files, or PR-changed files. It can
also print the plan, explain why a step is included or excluded, skip specific
steps, and emit JSON for machine consumption.

These features are a practical replacement for some homegrown "which command
should I run?" documentation:

- `hk check --plan`
- `hk check --why <step>`
- `hk check --pr`
- `hk check --profile ci --json`

### Conditional execution

HK docs say a step with glob only runs if at least one selected file matches that glob.

For example, this step will only run if any workflow file has been changed:

```pkl
["actionlint"] = (Builtins.actionlint) {
    glob = List(".github/workflows/*.yml", ".github/workflows/*.yaml")
}
```

### Mise integration

The repo already sets `HK_MISE = "1"` and pins `hk = "1.45.0"` in `mise.toml`.
That is the right foundation. HK can rely on mise to make external binaries
available without each hook wrapper duplicating activation logic.

## Builtins Inventory

### Already covered directly by HK

These builtins are already used or represented in `hk.pkl`:

| HK builtin                | Current usage                      | Notes                                     |
| ------------------------- | ---------------------------------- | ----------------------------------------- |
| `trailing_whitespace`     | Used in `pre-commit` and `check`   | Keep.                                     |
| `newlines`                | Used as `end-of-file-fixer`        | Keep.                                     |
| `mixed_line_ending`       | Used in `pre-commit` and `check`   | Keep.                                     |
| `check_merge_conflict`    | Used in `pre-commit` and `check`   | Keep.                                     |
| `detect_private_key`      | Used in `pre-commit` and `check`   | Keep, but it is narrower than `gitleaks`. |
| `check_case_conflict`     | Used in `pre-commit` and `check`   | Keep.                                     |
| `check_added_large_files` | Used with project asset exclusions | Keep custom exclusions.                   |
| `no_commit_to_branch`     | Used in `pre-commit`               | Keep.                                     |

### Already covered outside HK

These HK builtins correspond to tools already used elsewhere:

| HK builtin              | Current repo equivalent                          | Adoption guidance                                                                                                                          |
| ----------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `biome`                 | `bunx biome check...` via package/mise/gate      | Candidate. Use only if HK builtin can preserve strict flags: `--diagnostic-level=warn --error-on-warnings`. Otherwise keep custom HK step. |
| `knip`, `knip_strict`   | `bunx knip --no-exit-code`                       | Candidate. Current policy intentionally reports without failing. Do not switch to strict without a policy decision.                        |
| `hadolint`              | `mise exec -- hadolint Dockerfile`               | Candidate. Good fit for a CI/profile step.                                                                                                 |
| `tombi`, `tombi_format` | `tombi check mise.toml`                          | Candidate. Good fit for config profile.                                                                                                    |
| `actionlint`            | Available in `mise.toml`; referenced by CI guide | Strong candidate for CI and local workflow-file edits.                                                                                     |
| `tsc`                   | `bunx tsc --noEmit`                              | Candidate as a custom step or builtin if command shape matches. Verify Bun/package-manager invocation before adopting.                     |
| `mise`                  | `mise` validates mise config and usage           | Candidate if it matches current `tombi check mise.toml` and mise-specific expectations.                                                    |
| `pkl`, `pkl_format`     | Indirectly needed by HK config                   | Consider for `hk.pkl` validation/formatting if current HK validation is not enough.                                                        |

Tools with no direct HK builtin but still central:

| Current tool             | Current role                     | HK migration path                                                |
| ------------------------ | -------------------------------- | ---------------------------------------------------------------- |
| dependency-cruiser       | Architecture boundaries          | Keep custom HK step.                                             |
| jscpd                    | Duplication threshold            | Keep custom HK step.                                             |
| ls-lint                  | File naming rules                | Keep custom HK step.                                             |
| ast-grep                 | Structural lint/rewrite rules    | Keep custom HK step.                                             |
| Bun test                 | Unit/integration tests           | Keep custom HK step.                                             |
| preview smoke            | App-specific route/runtime smoke | Keep custom HK step.                                             |
| Electrobun build smoke   | App-specific build validation    | Keep custom HK step.                                             |
| container-structure-test | Docker artifact validation       | Keep in CI/mise or expose as custom HK `ci`/`container` profile. |

### High-value builtins to consider

| Builtin                                       | Why it matters                                                                                          | Suggested profile             | Notes                                                                                                                         |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `gitleaks`                                    | Detects leaked secrets beyond private-key patterns. This is the most compelling new adoption candidate. | `commit`, `pr`, `ci`          | Start in `ci` or `pr` first to baseline false positives. Add `gitleaks` to mise tools if adopted.                             |
| `actionlint`                                  | Validates GitHub Actions syntax and semantics.                                                          | `ci`, `workflow`              | Already installed via mise. Make it explicit in HK for workflow changes.                                                      |
| `zizmor`                                      | Audits GitHub Actions security posture.                                                                 | `ci`, `slow`                  | Strong security complement to `actionlint`; likely needs baseline tuning.                                                     |
| `pinact` / `pinact_update`                    | Pins GitHub Action versions.                                                                            | `ci`, `maintenance`           | Useful if the project wants stronger supply-chain reproducibility. Needs a policy decision because it changes workflow style. |
| `lychee`                                      | Link checker for docs.                                                                                  | `slow`, `docs`                | Valuable for this docs-heavy repo, but should not run on every commit.                                                        |
| `typos`                                       | Fast typo/spelling scanner.                                                                             | `docs`, maybe `commit`        | Likely false positives due tech terms and generated/reference assets; needs allowlist.                                        |
| `rumdl` or `markdown_lint`                    | Markdown linting.                                                                                       | `docs`, `ci`                  | The repo often disables markdownlint per file. Adopt only with scoped globs and existing conventions.                         |
| `yamllint` / `yamlfmt`                        | YAML validation/formatting.                                                                             | `config`, `ci`                | Useful for `assets/sources/*.yml`, workflows, and config. Must avoid generated/fixture churn.                                 |
| `sort_package_json`                           | Consistent package metadata ordering.                                                                   | `maintenance`, maybe `commit` | Useful if the team wants package metadata normalized.                                                                         |
| `editorconfig-checker`                        | Enforces `.editorconfig` beyond Biome-managed files.                                                    | `ci`                          | Useful for non-TS assets/config.                                                                                              |
| `check_executables_have_shebangs`             | Catches executable scripts without shebangs.                                                            | `commit`, `ci`                | Good cheap hygiene.                                                                                                           |
| `check_symlinks`                              | Catches broken symlinks.                                                                                | `commit`, `ci`                | Good cheap hygiene.                                                                                                           |
| `byte_order_marker` / `fix_byte_order_marker` | Prevents BOM drift.                                                                                     | `commit`, `ci`                | Cheap, low-risk.                                                                                                              |
| `fix_smart_quotes`                            | Prevents typographic quotes in code/config.                                                             | `docs`, maybe `commit`        | Use carefully; may be undesirable in prose unless scoped.                                                                     |
| `shellcheck` / `shfmt`                        | Shell script lint/format.                                                                               | `config`, `ci`                | Useful if shell scripts grow beyond current small wrappers.                                                                   |

### Lower-value or not relevant now

Most remaining builtins target ecosystems that are not primary in this repo:
Go, Rust, Python, Ruby, PHP, Swift, Kotlin, Terraform, Nix, Elixir, SQL, C/C++,
and miscellaneous framework-specific tools. They should not be added unless the
repo actually introduces those file types or generated assets that need them.

Examples: `cargo_*`, `go_*`, `ruff`, `black`, `mypy`, `rubocop`, `brakeman`,
`swiftlint`, `ktlint`, `terraform`, `tf_lint`, `tofu`, `sql_fluff`,
`clang_format`, `cmake_format`, `buf_*`, `mix_*`, `sorbet`, `selene`, and
similar ecosystem-specific checks.

## Proposed Profile Model

### `commit`

Purpose: fast checks for every local commit.

Candidate steps:

- existing hygiene builtins
- `biome` staged-file check/fix, if strict flags can be preserved
- `gitleaks` after a baseline
- `check_executables_have_shebangs`
- `check_symlinks`
- `byte_order_marker`

Do not put full test/build/jscpd/depcruise here by default. They are too heavy
for every commit and already belong in the full gate.

### `pr`

Purpose: changed-files or branch-diff validation.

Candidate command:

- `hk check --pr --profile pr`

Candidate steps:

- all `commit` checks
- `tsc`
- Biome strict
- actionlint for changed workflows
- hadolint for Dockerfile changes
- custom ast-grep check
- custom ls-lint check, if scoped behavior is reliable

### `ci`

Purpose: CI with reporters/artifacts.

Candidate steps:

- HK config validation
- commit message policy for HEAD
- actionlint
- gitleaks
- Biome with GitHub reporter
- knip compact report
- dependency-cruiser JSON report
- jscpd JSON report
- ls-lint report
- hadolint report
- ast-grep report
- tombi/mise config checks
- TypeScript

CI still needs GitHub workflow steps for artifact upload and JUnit/report
summary handling. HK should run tools; GitHub Actions should publish artifacts.

### `full`

Purpose: replacement candidate for `gate.sh` after parity is proven.

Candidate stages:

1. autofix group
2. policy group
3. lint/typecheck group
4. tests
5. preview smoke
6. build smoke

This profile should initially call the same commands as `gate.sh`, then later
split them into HK steps/groups when useful.

### `slow`

Purpose: useful but expensive checks.

Candidate steps:

- `lychee`
- `zizmor`
- full `gitleaks` history scan if desired
- build smoke on supported hosts
- container structure tests

## Simplification Opportunities

### 1. Replace duplicated lint orchestration with HK profiles

Today the lint chain is defined in multiple places:

- package scripts
- `mise run lint`
- `gate.sh`
- GitHub Actions shell blocks

HK can become the shared layer:

- Local: `mise exec -- hk check --profile pr`
- CI: `mise exec -- hk check --all --profile ci --check`
- Full gate: `mise exec -- hk check --all --profile full`

The package and mise scripts can remain as compatibility wrappers while the
source of composition moves to `hk.pkl`.

### 2. Make CI and local policy easier to compare

HK's `--plan`, `--why`, and JSON output make the active policy inspectable.
That helps avoid the common failure mode where docs say "the gate runs X" but
CI or local scripts actually run Y.

### 3. Improve pre-commit safety

HK's staged-file model plus fix/stash behavior is a good fit for the repo's
commit discipline. It can eventually make the local path both faster and safer
than whole-repo `lint:fix` for every small change.

### 4. Add security coverage without inventing new wrappers

`gitleaks`, `zizmor`, `pinact`, `check_executables_have_shebangs`, and
`check_symlinks` are high-leverage additions. They fit naturally as HK steps
and do not require new project-specific scripts unless baselining discovers
false positives.

## What HK Should Not Replace Yet

### Tool configs

Keep these as independent project policy:

- `biome.jsonc`
- `knip.jsonc`
- `.dependency-cruiser.cjs`
- `.jscpd.json`
- `.ls-lint.yml`
- `sgconfig.yml`
- `.hadolint.yaml`
- `tsconfig.json`

HK should run the tools; it should not absorb their policies.

### App-specific gate logic

The policy script, preview smoke, build smoke, and container structure checks
encode app-specific expectations. HK can call or sequence them, but it should
not hide their contract.

### CI publishing and reporting

GitHub Actions should continue to own:

- checkout/setup
- cache
- artifact upload
- JUnit summary publishing
- build artifact publishing
- PR comments/environments

HK can produce reports, but Actions should publish them.

## Risks

### Builtin defaults may be weaker than repo policy

Example: the HK `biome` builtin runs `biome check --no-errors-on-unmatched` by
default. This repo's strict path uses `--diagnostic-level=warn` and
`--error-on-warnings`. Adopting the builtin blindly would weaken enforcement.

Mitigation: wrap or override builtins. Do not replace custom commands until the
flags are proven equivalent.

### Knip policy is intentionally non-failing today

The current `lint:knip` uses `--no-exit-code`. Moving to `knip_strict` changes
policy and should require explicit SDD/maintainer approval.

Mitigation: keep current behavior in the first HK profile, then decide whether
to tighten separately.

### Reports and artifacts may regress

The CI lint job currently writes tool-specific outputs under
`tmp/reports/linters`. HK's default output is not a drop-in replacement for
those artifacts.

Mitigation: first implement HK steps that keep writing the same report files.

### Secret/link/doc tools need baselines

`gitleaks`, `lychee`, `typos`, `rumdl`, and `zizmor` may produce noisy first
runs.

Mitigation: add them in report-only or CI-only profiles first. Promote to
commit or required CI only after the baseline is understood.

## Suggested Migration Phases

### Phase 1 — Research and baseline

- Run candidate builtins manually:
  - `gitleaks`
  - `actionlint`
  - `zizmor`
  - `lychee`
  - `typos`
  - `rumdl`
  - `yamllint`
  - `editorconfig-checker`
- Capture false positives and runtime.
- Decide which candidates are required, optional, or rejected.

### Phase 2 — HK profile skeleton

- Add profiles to `hk.pkl` without removing existing commands.
- Keep existing custom command flags.
- Add `hk check --plan` examples to docs.
- Keep `gate.sh` as the authoritative full gate.

### Phase 3 — CI parity

- Add a CI job or step that runs the new HK `ci` profile.
- Compare outputs against the existing lint job.
- Keep artifact paths stable.
- Do not remove existing CI lint shell until parity is proven.

### Phase 4 — Local simplification

- Point `bun run lint` or `mise run lint check` at HK profiles only after CI
  parity.
- Keep old commands temporarily as compatibility aliases if useful.

### Phase 5 — Full gate consolidation

- Replace `gate.sh` internals or make `gate.sh` call HK `full`.
- Keep `gate.sh` path stable because AGENTS.md, Cursor commands, and project
  skills already point to it.

## Recommendation

Proceed to SDD for an HK orchestration migration with this boundary:

- In scope:
  - HK profiles
  - builtin adoption baseline
  - gitleaks/security additions
  - CI/local runner convergence
  - diagnostics via `--plan`, `--why`, and JSON
- Out of scope:
  - weakening any existing quality rule
  - replacing tool-specific configs
  - removing current CI reporting before parity
  - making knip strict without explicit policy approval

The likely end state is:

- HK owns quality execution profiles.
- Existing tool configs continue to own quality policy.
- `gate.sh` remains as a stable project entry point, but delegates more of its
  work to HK.
- CI and local flows converge on the same HK profile definitions.

## Implementation record (2026-05-27)

Branch: `feat-hk-orchestration` (worktree at `.worktrees/feat-hk-orchestration`).

### Profile commands

```sh
mise exec -- hk validate
mise exec -- hk check --all --check --plan          # hygiene only (no profile)
mise exec -- hk check --profile commit --plan
mise exec -- hk check --profile pr --plan
mise exec -- hk check --all --profile ci --plan
mise exec -- hk check --all --profile full --plan
mise exec -- hk check --slow --plan                 # gitleaks-full baseline
```

### Conditional `actionlint`

- Skipped when no workflow file is in the selected set:
  `hk check src/shell/main/main.ts --profile pr --plan` → `actionlint-pr (no files matched filters)`.
- Included when a workflow file is selected:
  `hk check .github/workflows/review.yml --profile pr --plan` → `actionlint-pr (1 file matched)`.

### `gitleaks` baseline

- Tool: `gitleaks 8.30.1` via `mise.toml`.
- Baseline command: `gitleaks detect --redact --log-opts="HEAD~1..HEAD"` (~1.8s, 0 leaks on HEAD).
- HK steps `gitleaks-baseline-ci` / `gitleaks-baseline-pr` use `|| true` — not commit-blocking until triaged.

### Builtin adoption decisions

| Candidate | Decision | Notes |
| --------- | -------- | ----- |
| `check_executables_have_shebangs` | Adopt | pre-commit + `commit`/`pr` profiles |
| `check_symlinks` | Adopt | pre-commit + `commit`/`pr` profiles |
| `actionlint` | Adopt | file-scoped; duplicate steps for `pr` and `ci` profiles |
| `hadolint` / `tombi` | Adopt | file-scoped; duplicate steps for `pr` and `ci` |
| `gitleaks` | Baseline | report-only via `\|\| true`; `slow` profile has fuller scan |
| `zizmor`, `pinact`, `lychee`, `typos`, `rumdl`, etc. | Defer | noisy; see Phase 3.3 in tasks.md |

### `gate.sh` delegation

- **Not delegated** in this pass. `pre-push` still runs `gate.sh` directly.
- HK `full` profile mirrors gate stages for `--plan` parity; use
  `bash .agents/skills/app-quality-gate/scripts/gate.sh` as the executable authority until
  a follow-up proves step-for-step equivalence under `hk check --all --profile full --check`.

### CI parity

- `.github/workflows/review.yml` adds `HK CI profile (parity)` step running
  `mise exec -- hk check --all --profile ci --check` alongside the existing lint job.
- Existing lint job, artifacts, and summaries are unchanged.

### HK profile AND semantics

HK requires **all** profiles listed on a step to be enabled. Steps that should run under
either `pr` or `ci` are duplicated (e.g. `actionlint-pr` and `actionlint-ci`) rather than
`profiles = List("pr", "ci")`.
