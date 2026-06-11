<!-- markdownlint-disable-file -->

# Implementation Plan: Spec Kit orchestrator loop

**Branch (Slice A)**: `feature/012-spec-kit-commands` | **Branch (Slice B)**: `feature/012-spec-kit-orchestrator-loop` | **Date**: 2026-06-10 | **Spec**: [`spec.md`](./spec.md)

**Input**: Feature specification from `assets/specs/012-spec-kit-orchestrator-loop/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

This feature closes the automation gap after the 009 orchestrator engine, 010 packages, and 011 CLI hub. It introduces the `spec kit` CLI subcommand tree to mirror the Spec Kit workflow stages (from specify to pr-check) and implements the `spec kit next` resolver and dispatcher.

Our technical approach aligns with the following key clarifications:

1. **External resolution**: `kit next` resolves and handles stage transitions (including backward loops and human gates) externally using feature/run state files on disk **without modifying** the core `workflowMachine` state machine.
2. **Review envelope mapping**: Failed reviews map `FIX` → `RETRYABLE_FAILURE` with diagnostic code `REVIEW_FIX_REQUIRED`, writing the fix handoff path into `artifacts_created` and `evidence[]` (kind: `"artifact"`). Approved reviews map to `status: "DONE"` with diagnostic code `REVIEW_APPROVE`.
3. **Explicit tail stages**: `pr-prep`, `pr-open`, and `pr-check` are explicit kit verbs in the canonical sequence; **`default.yaml` transitions and mass profile rebind are Slice B** (see § Delivery slices).

**Resolver design:** A new **`kit_step_resolver`** module implements the full § Canonical step sequence table. It **reads** `detectPhase()` / `scanFeatureDir()` output as one input signal but is **not** a rename of `detectPhase()` — condensed detector phases remain for backward-compatible dry-run until the resolver subsumes them in tests.

## Delivery slices

One feature spec, **two PRs**. `tasks.md` MUST label every task **Slice A** or **Slice B**. Slice B merges only after Slice A is green on `main`.

| Slice | PR branch (suggested)                    | Delivers                                                                                             | Operator outcome                                                                                    |
| ----- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **A** | `feature/012-spec-kit-commands`          | All § Canonical step sequence **kit verbs** + **`kit next`** (single step + `--dry-run`) + envelopes | Run `mise run spec kit next` repeatedly (or each verb explicitly); same manual habit, deterministic |
| **B** | `feature/012-spec-kit-orchestrator-loop` | Profile bindings, **`kit next --loop`**, `spec workflow run` alias, review-fix R2R, SMOKE-01         | One command runs the full loop to gate / PR green                                                   |

**Out of band:** [`013-task-runner-tree-ux`](../013-task-runner-tree-ux/) (TTY spike) — not a dependency for either slice.

### Slice A — Kit commands (PR 1)

**Requirements:** SKO-1, SKO-4, SKO-8 (AC1–4 only).

**Includes:**

- `mise.toml` nested `cmd "kit"` + `tools/bin/spec_kit.script.ts`
- Per-verb handlers matching § Kit verb reference (Goal / Measure / Evidence)
- `kit_step_resolver.script.ts` — full canonical table (clarify, checklist, human gates, tail verbs)
- `kit next`: resolve → preflight → dispatch **one** verb; `--dry-run`; human gate pause without `--approve`
- Envelope write on every verb completion (`tmp/workflow-runs/.../envelope.<stage>.json`)
- Co-located `spec_kit.script.spec.ts` + route tests in `spec.script.spec.ts`

**Explicitly deferred to Slice B:**

- `kit next --loop`
- `spec workflow run` → loop delegation
- `default.yaml` mass rebind to `mise run spec kit next`
- xstate Orchestrator actor driving stages
- Automated review-fix loop (manual: `kit implement` again after FIX)
- SMOKE-01 CI orchestrator path
- NDJSON `stage.entered` / `transition.auto` beyond optional single-step events

**Slice A checkpoint (all exit 0):**

```sh
mise run spec kit
mise run spec kit next assets/specs/012-spec-kit-orchestrator-loop --dry-run
bun test --config /dev/null tools/bin/spec_kit.script.spec.ts
bash .agents/skills/app-quality-gate/scripts/gate.sh
```

**Slice A done when:** Every row in § Canonical step sequence has a working mise task; `kit next` advances one step correctly on fixture dirs at each phase.

### Slice B — Orchestrator loop (PR 2)

**Prerequisite:** Slice A merged on `main`.

**Requirements:** SKO-2, SKO-3, SKO-5, SKO-6, SKO-7, SKO-8 (AC5–6).

**Includes:**

- `assets/catalog/workflows/default.yaml` — add `pr-open` / `pr-check` stages; rebind `command:` to `mise run spec kit next` (or pinned verbs)
- `kit next --loop` and `mise run spec workflow run` as alias
- `@kb/workflow-runtime` Orchestrator wired from `workflow_run.script.ts`
- Review-fix R2R (SKO-5) inside the loop
- `providers.pr_open` / `ci_status` integrated with terminal messaging
- SMOKE-01: fixture feature through loop in `.github/workflows/smoke.yml`
- Resume / snapshot on `NEED_INPUT` and human gates

**Slice B checkpoint (all exit 0):**

```sh
mise run spec kit next tools/__tests__/fixtures/workflow/smoke-feature --loop
mise run spec workflow run tools/__tests__/fixtures/workflow/smoke-feature --dry-run
mise run spec test smoke
bash .agents/skills/app-quality-gate/scripts/gate.sh
```

## Feature deltas

### Slice A

| Topic         | Delta                                                                                                                                                                        |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CLI routing   | Add `spec kit` subcommand tree in `mise.toml`; route from `tools/bin/spec.script.ts` to `tools/bin/spec_kit.script.ts`.                                                      |
| Step resolver | New `packages/workflow-runtime/src/kit_step_resolver.script.ts` — full canonical table; human-gate rows; review FIX rewind target (resolve only; automated loop is Slice B). |
| Preflight     | New `packages/workflow-runtime/src/kit_preflight.script.ts` — allowlist, sandbox policy, human gate unless `--approve`, worker timeout.                                      |
| Envelopes     | New `packages/workflow-runtime/src/kit_envelope.script.ts` — write/validate stage envelopes under `tmp/workflow-runs/`.                                                      |
| Verb handlers | `packages/workflow-runtime/src/kit_verbs/*.script.ts` — one module per kit verb (or grouped shell vs LLM); dispatched from `spec_kit.script.ts`.                             |
| Human gates   | Gate marker files + `kit next --approve` in `kit_human_gate.script.ts` (or colocated in preflight).                                                                          |

### Slice B

| Topic             | Delta                                                                                                                                                     |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workflow catalog  | Update `assets/catalog/workflows/default.yaml` — `pr-prep`, `pr-open`, `pr-check` as stages; bind commands to `mise run spec kit next` or explicit verbs. |
| Orchestrator loop | Wire `Orchestrator` from `tools/governance/specs/workflow_run.script.ts`; delegate `spec workflow run` → `kit next --loop`.                               |
| Review-fix loop   | Envelope validation + transition rewind in loop (SKO-5); diagnostic codes `REVIEW_APPROVE` / `REVIEW_FIX_REQUIRED`.                                       |
| Providers         | Integrate `orchestrator_providers.script.ts` for `pr-open` / `pr-check` terminal messaging.                                                               |
| CI smoke          | SMOKE-01 fixture path in `.github/workflows/smoke.yml`.                                                                                                   |

## Canonical step → handler traceability

Normative copy of [`spec.md` § Canonical step sequence](./spec.md#canonical-step-sequence) with **handler module paths**. Adding or reordering rows requires updating this table, `kit_step_resolver.script.ts`, and `conformance.script.spec.ts` in the same PR.

| #   | Step id           | Mise task                                | Handler module                                                                   | Slice | Done when (summary)                                          |
| --- | ----------------- | ---------------------------------------- | -------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------ |
| 0   | *(bootstrap)*     | `mise run spec init`                     | `tools/governance/specs/feature_init.script.ts` (existing)                       | —     | Feature dir + `spec.md` exist (greenfield only)              |
| 1   | specify           | `mise run spec kit specify`              | `kit_verbs/specify.script.ts`                                                    | A     | `spec.md` exists; spec lint strict-ready                     |
| 2   | review-spec       | *(gate)*                                 | `kit_human_gate.script.ts`                                                       | A     | Operator `--approve` after reading `spec.md`                 |
| 3   | clarify           | `mise run spec kit clarify`              | `kit_verbs/clarify.script.ts`                                                    | A     | No open `[NEEDS CLARIFICATION]` in spec                      |
| 4   | checklist         | `mise run spec kit checklist`            | `kit_verbs/checklist.script.ts`                                                  | A     | `checklists/requirements.md` complete                        |
| 5   | plan              | `mise run spec kit plan`                 | `kit_verbs/plan.script.ts`                                                       | A     | `plan.md` exists                                             |
| 6   | review-plan       | *(gate)*                                 | `kit_human_gate.script.ts`                                                       | A     | Operator `--approve` after reading `plan.md`                 |
| 7   | analyze-plan      | `mise run spec kit analyze --pass plan`  | `kit_verbs/analyze.script.ts`                                                    | A     | `checklists/analyze-plan.md` exists                          |
| 8   | tasks             | `mise run spec kit tasks`                | `kit_verbs/tasks.script.ts`                                                      | A     | `tasks.md` + `handoff.md` exist                              |
| 9   | review-tasks      | *(gate)*                                 | `kit_human_gate.script.ts`                                                       | A     | Operator `--approve` after reading `tasks.md` + `handoff.md` |
| 10  | analyze-tasks     | `mise run spec kit analyze --pass tasks` | `kit_verbs/analyze.script.ts`                                                    | A     | `checklists/analyze-tasks.md` exists                         |
| 11  | review-handoff    | *(gate)*                                 | `kit_human_gate.script.ts`                                                       | A     | Gherkin handoff emitted if required; operator `--approve`    |
| 12  | handoff-generate  | `mise run spec kit handoff-generate`     | `kit_verbs/handoff_generate.script.ts`                                           | A     | `tmp/handoffs/opencode-{slug}-gherkin.md` or SKIPPED         |
| 13  | implement         | `mise run spec kit implement`            | `kit_verbs/implement.script.ts`                                                  | A     | `checklists/implement-done.md`; Evidence commands pass       |
| 14  | pr-prep           | `mise run spec kit pr-prep`              | `kit_verbs/pr_prep.script.ts`                                                    | A     | `hk check --profile pr` exits 0                              |
| 15  | review            | `mise run spec kit review`               | `kit_verbs/review.script.ts`                                                     | A     | Envelope `APPROVE` or `FIX` (+ handoff path)                 |
| 16  | gate              | `mise run spec kit gate`                 | `kit_verbs/gate.script.ts`                                                       | A     | `mise run spec gate` + `gate.sh` exit 0                      |
| 17  | pr-open           | `mise run spec kit pr-open`              | `kit_verbs/pr_open.script.ts`                                                    | A     | PR created; ref under run dir                                |
| 18  | pr-check          | `mise run spec kit pr-check`             | `kit_verbs/pr_check.script.ts`                                                   | A     | Required CI checks green                                     |
| —   | terminal          | `kit next` message                       | `spec_kit.script.ts` (`printTerminalSuccess`)                                    | A/B   | Run id, PR URL (B), all stages complete — ready for manual testing                 |
| *   | `kit next`        | `mise run spec kit next`                 | `spec_kit.script.ts` + `kit_step_resolver.script.ts` + `kit_preflight.script.ts` | A     | Resolve → preflight → dispatch one verb                      |
| *   | `kit next --loop` | `mise run spec kit next --loop`          | `spec_kit.script.ts` → `orchestrator.script.ts`                                  | B     | Repeat until pause or terminal                               |
| *   | workflow alias    | `mise run spec workflow run`             | `workflow_run.script.ts` delegates to `kit next --loop`                          | B     | Same as loop                                                 |

All paths under `packages/workflow-runtime/src/` unless prefixed with `tools/`. Resolver reads feature dir via `resolveActiveFeatureDir()` from `tools/governance/specs/resolve_active_feature_dir.script.ts`.

## Technical Context

**Language/Version**: TypeScript / Bun 1.x

**Primary Dependencies**: Bun runtime, `@kb/workflow-core`, `@kb/workflow-runtime`, Elysia + Eden, TypeBox

**Storage**: Local JSON files (snapshots and envelopes under `tmp/workflow-runs/`)

**Testing**: `bun test` co-located specs, fixture-backed testing (no live spec dependencies)

**Target Platform**: macOS, Linux

**Project Type**: CLI tools / Desktop Orchestration

**Performance Goals**: CLI resolver invocation < 150ms overhead (excluding LLM latency)

**Constraints**: Offline-capable (except CI checks and PR creation), strict sandbox isolation constraints

**Scale/Scope**: ~18 stages in sequence, 2 PR delivery slices (Slice A: verbs + single-step `next`; Slice B: orchestrator loop + R2R + CI providers)

**CI check retry policy**: `max_attempts` = 3 (from profile config/default), with a 30s interval between checks; constant polling target for GH checks (no exponential backoff).

**LLM Dispatch Seam**: Each LLM verb handler (specify, clarify, checklist, plan, analyze, tasks, implement) dispatches to the configured provider's command (e.g., Cursor `/speckit-*` slash command or standard orchestrator provider CLI). The handler invokes the integration seam and expects the corresponding envelope file `tmp/workflow-runs/<date>/<run_id>.envelope.<stage>.json` to be written by the worker or provider. The handler does not parse stdout; the envelope is the single source of truth for completion.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Principle I: Product Identity**: Yes. CLI commands support keyboard-driven flow and fast local-first resolutions.
- **Principle II: FCIS Core/Shell boundaries**: Yes. Pure resolution rules stay in `workflow-core` where possible; file I/O, subprocess spawning, and envelope persistence live in `workflow-runtime` and `tools/bin/`.
- **Principle IV: TypeBox Validation**: Yes. Envelope and snapshot validation use TypeBox schemas only. Zod is strictly excluded.
- **Principle V: Test-First & Co-located Specs**: Yes. All new logic in `spec_kit.script.ts`, resolver, preflight, and verb modules will have co-located `*.spec.ts` files.
- **Principle IX: Security (Electrobun & Sandbox)**: Yes. LLM stages run inside sandbox boundaries. `mise run spec security` is integrated in the gate.

## Project Structure

### Documentation (this feature)

```text
assets/specs/012-spec-kit-orchestrator-loop/
├── spec.md              # Feature specification
├── plan.md              # Technical design plan (this file)
├── tasks.md             # Ordered task checklist (/speckit-tasks — pending)
├── handoff.md           # Handoff criteria (/speckit-tasks — pending)
└── checklists/
    ├── requirements.md  # Spec quality checklist
    └── orchestrator.md  # Custom orchestrator quality checklist
```

### Source Code (repository root)

```text
packages/workflow-core/
├── src/
│   ├── index.ts
│   ├── machine.script.ts
│   └── schemas/
│       └── envelope.schema.ts
packages/workflow-runtime/
├── src/
│   ├── orchestrated_handoff.script.ts   # detectPhase() — input to resolver; unchanged contract in Slice A
│   ├── kit_step_resolver.script.ts      # NEW — full canonical table
│   ├── kit_preflight.script.ts          # NEW
│   ├── kit_human_gate.script.ts         # NEW
│   ├── kit_envelope.script.ts           # NEW
│   ├── kit_verbs/                       # NEW — per-verb handlers
│   │   ├── specify.script.ts
│   │   ├── clarify.script.ts
│   │   ├── checklist.script.ts
│   │   ├── plan.script.ts
│   │   ├── analyze.script.ts
│   │   ├── tasks.script.ts
│   │   ├── handoff_generate.script.ts
│   │   ├── implement.script.ts
│   │   ├── pr_prep.script.ts
│   │   ├── review.script.ts
│   │   ├── gate.script.ts
│   │   ├── pr_open.script.ts
│   │   └── pr_check.script.ts
│   ├── orchestrator.script.ts
│   ├── orchestrator_providers.script.ts
│   └── runs_cli.script.ts
tools/bin/
├── spec.script.ts                       # route `kit` → spec_kit.script.ts
└── spec_kit.script.ts                   # NEW — kit router + `next` dispatcher
mise.toml                                # nested cmd "kit" { … }
assets/catalog/workflows/default.yaml    # Slice B — stage command rebind
tools/governance/specs/
└── workflow_run.script.ts               # Slice B — delegate to kit next --loop
```

**Structure Decision**: Packages/monorepo. Resolver and verb I/O in `@kb/workflow-runtime`; thin CLI entry in `tools/bin/spec_kit.script.ts` (same pattern as 011 `spec.script.ts`).

## Requirement traceability

| Requirement   | Slice | Scenario / spec file                                                        | Notes                                               |
| ------------- | ----- | --------------------------------------------------------------------------- | --------------------------------------------------- |
| SKO-1         | A     | `spec_kit.script.spec.ts`                                                   | CLI route cases and `--help`.                       |
| SKO-4         | A     | `kit_envelope.script.spec.ts`, `envelope.schema.spec.ts`                    | Envelope write + TypeBox validation.                |
| SKO-8 (AC1–4) | A     | `kit_step_resolver.script.spec.ts`, `spec_kit.script.spec.ts`               | Phase→verb matrix; preflight blocking; `--dry-run`. |
| SKO-8 (AC5–6) | B     | `spec_kit.script.spec.ts`, `workflow_run.script.spec.ts`                    | `--loop`; terminal PR URL messaging.                |
| SKO-2         | B     | `conformance.script.spec.ts`                                                | Profile stage bindings and transitions.             |
| SKO-3         | B     | `workflow_run.script.spec.ts`                                               | Orchestrator loop delegation and resume.            |
| SKO-5         | B     | `orchestrator.script.spec.ts`                                               | Review FIX → rewind to implement.                   |
| SKO-6         | B     | `orchestrator_providers.script.spec.ts`, `kit_verbs/pr_open.script.spec.ts` | PR creation and CI watch.                           |
| SKO-7         | B     | `spec_test.script.spec.ts`                                                  | SMOKE-01 fixture run.                               |

## Complexity Tracking

*No constitution violations present. Design utilizes standard patterns.*
