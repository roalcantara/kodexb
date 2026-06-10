<!-- markdownlint-disable-file -->

# Mise SDD CLI reorganization

**Feature Branch**: `feature/011-mise-sdd-cli`
**Release**: v0.x
**Status**: Draft

**Input**: [`010-workflow-packages`](../010-workflow-packages/) merged on `main` (`@kb/workflow-*` on disk, PROFILE-SDD-01 + SMOKE-01 wired). **011** delivers a **breaking** mise task reorganization: all SDD execution commands under `mise run spec`, unified TTY/`--raw` output, and **orchestrator dogfood** as the mandatory closeout.

## Introduction

Operators and agents scatter SDD commands across `spec`, `audit`, `test tag`, and unwired `mise.toml` usage entries — with inconsistent console output. Package extraction (010) separates the engine; 011 reshapes the **operator surface** without changing orchestrator semantics.

**Baseline:** 010 merged before 011 implementation. Use **post-011** command names in guides; update `default.yaml` bindings in the same PR as part of migration.

**Delivery:** **one PR** on `feature/011-mise-sdd-cli`. **Closeout MUST** run the xstate orchestrator (`mise run spec workflow run` after rename) against this feature dir through terminal gate (MSC-9).

## Authority

| Topic            | Authority                                                                                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Engine behavior  | [`009`](../009-agentic-workflow-orchestrator/spec.md), packages [`010`](../010-workflow-packages/spec.md)                                                    |
| Mise task shape  | [`MISE_GUIDE.md`](../../guides/MISE_GUIDE.md)                                                                                                                |
| CLI gum styling  | [`gum_theme.script.ts`](../../../tools/support/lib/cli/gum_theme.script.ts), [`render_mode.script.ts`](../../../tools/support/lib/cli/render_mode.script.ts) |
| Command tree     | [`plan.md`](./plan.md) § Mise CLI reorganization                                                                                                             |
| Workflow profile | [`default.yaml`](../../catalog/workflows/default.yaml) — update bindings in migration                                                                        |

## Out of scope

- Further package extraction (010)
- Process/container isolation (009 OQ-8)
- Renderer imports of workflow packages
- npm publish of `@kb/workflow-*`
- Backward-compatible aliases for removed mise invocations (spec + guides updated in the same PR)

## Glossary

| Term                     | Meaning                                                                                |
| ------------------------ | -------------------------------------------------------------------------------------- |
| **SDD hub**              | `mise run spec` — single lookup for spec lifecycle, workflow, audit, and feature tests |
| **Pretty mode**          | TTY stdout, no `--raw`: `gum spin` per step + summary table                            |
| **Raw mode**             | Non-TTY or `--raw`: machine-parseable step lines (stable schema in plan)               |
| **Orchestrator dogfood** | Full `spec workflow run` over the 011 feature dir with xstate stage progression        |
| **Active feature**       | Resolved via `resolveActiveFeatureDir()` (`.specify/feature.json`, branch, cwd)        |

## Clarifications

### Session 2026-06-10

- Q: How does `spec test --feat <dir>` discover a feature's test files, especially infra features with no catalog key? → A: **Active dir from `.specify/feature.json`** (via `resolveActiveFeatureDir()`, `--feat` overrides). **Feature-scoped tests run against committed fixture feature-dirs** under `tools/__tests__/fixtures/<feature>/` (e.g. `000-feature-demo`) using Fishery `factoryFor` from `@testing` — **never** live `assets/specs/NNN-*` (consistent with the 009/010 determinism rule). e2e is selected via `tag.script.ts` when the feature has a catalog tag; keyless infra features run their governance/workflow specs (which consume those fixtures) + no e2e. Full scope matrix in [`plan.md`](./plan.md) § `spec test`.
- Q: What raw-mode line format should `task_runner` emit (non-TTY / `--raw`)? → A: **Prefixed text lines** (not JSON): one `STEP <id> <ok\|fail\|skip> exit=<n> ms=<n> <title>` line per step, then a final `TASK <task> <ok\|fail> ms=<n> steps=<n> failed=<n>` summary line. Exact grammar in [`plan.md`](./plan.md) § Output contract.
- Q: How is the `mise run spec` multi-level command tree modeled in the `usage` spec? → A: **Native nested `cmd` blocks** to the required depth (confirmed supported by the [usage spec](https://usage.jdx.dev/spec/) — `cmd` may nest arbitrarily and carry its own args/flags), e.g. `cmd "audit" { cmd "docs" { cmd "rogue-refs" {…} } }`. Cross-cutting flags (`--raw`, `--feat`, `--json`) are declared **once** as `global` flags at the `spec` level (not redeclared per subcommand). mise validates subcommand routing and emits per-level `--help`; the thin `bun tools/bin/spec.script.ts` routes on the **positional subcommand chain from `process.argv`** (the script's existing `usage_cmd ?? args.shift()` fallback, version-robust for nested cmds) and reads flags — including the `global` ones — from `usage_*` env vars. Skeleton in [`plan.md`](./plan.md) § Usage spec structure.
- Q: Which advanced `usage` features should the `spec` tree adopt? → A: **`choices` enums** (mise validates + lists in `--help`, removing script-side checks): `spec test [scope]` = `choices "unit" "e2e" "smoke" "regression"` (replaces the 4 mutually-exclusive boolean flags; omitted = default composite); `workflow runs <action>` = `list|show|tail|prune`; `review-handoff <action>` = `classify|extract-evidence|prepare|scaffold-audit`; `workflow handoff generate --focus` = `gherkin|catalog|e2e-fix` (default `gherkin`); `--worker` = `opencode` (default). **Defaults** retained on `--root`/`--focus`/`--base`/`--worker`. Optional polish deferred (not this PR): `count` flag for `task_runner` verbosity (`-v`/`-vv`), `var=#true` variadic targets for `lint`/`audit feature`, required `init` `--id`/`--slug`.

## REQUIREMENT MSC-1: Unified step runner output

**Slice:** MVP

**User story:** As an operator, I want consistent TTY and CI output across multi-step mise tasks.

### Acceptance criteria

1. WHEN any multi-step `spec`, `app`, `policy`, or `catalog` command runs, THEN the system SHALL route steps through shared `task_runner` with pretty mode (TTY, no `--raw`: gum spin + summary) or raw mode (non-TTY or `--raw`: machine lines per [`plan.md`](./plan.md)).
   - **Measure:** TTY and `CI=true` runs produce expected shapes.
   - **Evidence:** `task_runner.script.spec.ts`; `mise run spec gate` on TTY and `--raw`.

---

## REQUIREMENT MSC-2: SDD hub under `spec`

**Slice:** MVP

**User story:** As an operator, I want one mise entrypoint for all SDD commands so discovery is predictable.

### Acceptance criteria

1. WHEN an operator runs `mise tasks` or reads [`MISE_GUIDE.md`](../../guides/MISE_GUIDE.md), THEN all SDD execution commands SHALL be documented as subcommands of `mise run spec`.
   - **Measure:** No top-level `audit` task; usage matches plan command tree.
   - **Evidence:** `mise.toml` + `MISE_GUIDE.md`.

---

## REQUIREMENT MSC-3: `spec test` feature-scoped runner

**Slice:** MVP

**User story:** As an operator, I want feature-scoped test scopes so I do not run the whole repo during SDD.

### Acceptance criteria

1. WHEN the operator runs `mise run spec test` with optional `--feat <dir>` and an optional positional `[scope]` (a `choices` enum: `unit`, `e2e`, `smoke`, `regression`), THEN behavior SHALL match the matrix in [`plan.md`](./plan.md) § `spec test`. mise validates the enum and rejects an unknown/duplicate scope natively — the dispatch script does **not** hand-enforce exclusivity. The active feature resolves via `resolveActiveFeatureDir()` (`.specify/feature.json`, `--feat` overrides); feature-scoped unit/governance specs run against committed fixtures under `tools/__tests__/fixtures/<feature>/` (Fishery factories), never live `assets/specs/NNN-*`; e2e runs via `tag.script.ts` only when the feature has a catalog tag. Omitted `[scope]` = default composite (unit + governance specs + e2e-if-tagged).
   - **Measure:** Each `[scope]` value exits 0 on the 011 feature dir; an invalid scope is rejected by mise (non-zero) without reaching the script; no run touches live `assets/specs/NNN-*`.
   - **Evidence:** `spec_test.script.spec.ts` (fixture-backed); smoke workflow updated if applicable.

---

## REQUIREMENT MSC-4: `spec workflow run`

**Slice:** MVP

**User story:** As an operator, I want a stable workflow start command aligned with the orchestrator profile.

### Acceptance criteria

1. WHEN the operator starts orchestrated-handoff, THEN the entry command SHALL be `mise run spec workflow run` (not `spec workflow orchestrated-handoff`).
   - **Measure:** Dispatch + `default.yaml` use new name.
   - **Evidence:** `spec.script.ts`; profile diff.

---

## REQUIREMENT MSC-5: `spec init`

**Slice:** MVP

**User story:** As an operator, I want a short init command when scaffolding numbered features.

### Acceptance criteria

1. WHEN the operator scaffolds a new feature, THEN the command SHALL be `mise run spec init --id <NNN> --slug <slug>`.
   - **Measure:** `feature-init` removed from usage.
   - **Evidence:** `feature_init` dispatch + guide update.

---

## REQUIREMENT MSC-6: Audit absorbed into `spec audit`

**Slice:** MVP

**User story:** As an operator, I want audit subcommands under `spec` so SDD hygiene stays in one hub.

### Acceptance criteria

1. WHEN the operator runs docs hygiene or security scans during SDD, THEN commands SHALL be `mise run spec audit docs rogue-refs`, `spec audit feature <dir>`, and `spec audit security …`.
   - **Measure:** Top-level `audit` task removed.
   - **Evidence:** `audit.script.ts` merged into spec paths.

---

## REQUIREMENT MSC-7: Thin task entrypoints

**Slice:** MVP

**User story:** As a maintainer, I want mise.toml thin so task logic lives in testable Bun scripts.

### Acceptance criteria

1. WHEN `mise.toml` defines `app`, `policy`, `spec`, or `catalog`, THEN each SHALL use a one-line `run = "bun tools/bin/<task>.script.ts"` body (no inline blocks > 20 lines).
   - **Measure:** `mise run policy check` and `mise run app gates all` exit 0.
   - **Evidence:** `app.script.ts`, `policy.script.ts`.

---

## REQUIREMENT MSC-8: Implementation driven by workflow profile

**Slice:** Dogfood

**User story:** As a maintainer, I want 011 implementation observable through the xstate orchestrator so the engine is validated under real SDD phase progression.

### Acceptance criteria

1. WHEN 011 implementation proceeds, THEN at least one workflow run SHALL record stage transitions (`stage.entered` / `stage.completed` or equivalent) for the 011 feature dir via `default.yaml`.
   - **Measure:** Run artifact under `tmp/workflow-runs/` or documented log.
   - **Evidence:** MSC-DOGFOOD-01 task; not required in engine unit tests.

---

## REQUIREMENT MSC-9: Mandatory orchestrator closeout

**Slice:** Dogfood

**User story:** As a maintainer, I want 011 acceptance proven by a full orchestrator run through terminal gate.

### Acceptance criteria

1. WHEN 011 ships, THEN closeout SHALL complete `mise run spec workflow run` (feature `assets/specs/011-mise-sdd-cli`) through terminal gate with `mise run spec gate` and `gate.sh` exit 0.
   - **Measure:** Final run status `DONE` at terminal stage; no unresolved `stage.escalated`.
   - **Evidence:** PR links run id; [`handoff.md`](./handoff.md) verify block.

---

## REQUIREMENT MSC-10: Single PR delivery

**Slice:** Closeout

**User story:** As a reviewer, I want one breaking mise migration PR with documented dogfood evidence.

### Acceptance criteria

1. WHEN 011 ships, THEN mise CLI + guides + CI + `default.yaml` renames SHALL land in one PR.
   - **Measure:** `mise run spec gate assets/specs/011-mise-sdd-cli` green.
   - **Evidence:** PR lists MSC-1…MSC-9.

## Delivery map

| Track                | Requirements |
| -------------------- | ------------ |
| SDD CLI              | MSC-1…MSC-7  |
| Orchestrator dogfood | MSC-8…MSC-9  |
| Program closeout     | MSC-10       |

See [`tasks.md`](./tasks.md).
