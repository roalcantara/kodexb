<!-- markdownlint-disable-file -->

# Handoff — Spec Kit orchestrator loop (`012`) — Slice B

**Spec:** [`spec.md`](./spec.md) (SKO-1…SKO-8) · **Plan:** [`plan.md`](./plan.md) · **Tasks:** [`tasks.md`](./tasks.md)

**Branch:** `feature/012-spec-kit-orchestrator-loop` · **Base:** `main` (Slice A merged)

**Predecessors:** [`009-agentic-workflow-orchestrator`](../009-agentic-workflow-orchestrator/) · [`010-workflow-packages`](../010-workflow-packages/) · [`011-mise-sdd-cli`](../011-mise-sdd-cli/) · **Slice A** (`feature/012-spec-kit-commands`) merged on `main`

**Status:** **PR [#30](https://github.com/roalcantara/kodexb/pull/30) green** — Slice B (Phases 8–12) complete; merge pending @ `f554c4af`

---

## Shipped on `main` (Slice A — do not re-implement)

| Deliverable                                       | Location                                                    |
| ------------------------------------------------- | ----------------------------------------------------------- |
| `mise run spec kit <verb>` tree                   | `mise.toml`, `tools/bin/spec_kit.script.ts`                 |
| Canonical step resolver                           | `packages/workflow-runtime/src/kit_step_resolver.script.ts` |
| Envelope write/read + TypeBox validation          | `packages/workflow-runtime/src/kit_envelope.script.ts`      |
| Human gates (`--approve`, `.gates/*.approved`)    | `packages/workflow-runtime/src/kit_human_gate.script.ts`    |
| Single-step `kit next` (`--dry-run`, `--approve`) | `tools/bin/spec_kit.script.ts`                              |
| Verb handler stubs (LLM + tail)                   | `packages/workflow-runtime/src/kit_verbs/*.script.ts`       |

**Slice A checkpoint (T029)** — already green on `main`. Re-run only when touching Slice A files.

---

## Scope (this PR)

| Slice | Branch                                   | Phases | Outcome                                                                |
| ----- | ---------------------------------------- | ------ | ---------------------------------------------------------------------- |
| **B** | `feature/012-spec-kit-orchestrator-loop` | 8–12   | Profile rebind, `kit next --loop`, `workflow run` alias, R2R, SMOKE-01 |

**Out of band:** [`013-task-runner-tree-ux`](../013-task-runner-tree-ux/) — not a blocker.

---

## Implementer rules

| Rule                    | Detail                                                                                                                                                |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Plan wins on layout** | Module paths in [`plan.md` § Canonical step → handler traceability](./plan.md#canonical-step--handler-traceability) override older task wording       |
| **Resolver**            | Extend behaviour via `kit_step_resolver.script.ts` + orchestrator — do **not** grow `detectPhase()` to 18 rows                                        |
| **No duplicate loop**   | `spec workflow run` MUST delegate to `kit next --loop`; one loop implementation                                                                       |
| **Fixture path**        | Smoke and loop tests use `tools/__tests__/fixtures/workflow/smoke-feature/` — never hardcode live `assets/specs/NNN-*` in `packages/` or `tools/bin/` |
| **Retro**               | Explicitly out of scope                                                                                                                               |
| **Stop line**           | **T041** green locally + [PR CI](https://github.com/roalcantara/kodexb/actions/runs/27364457617) — merge when approved                                |

---

## Agent workflow

| Step | Action                                                                                                                                                   |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Branch `feature/012-spec-kit-orchestrator-loop` from `main`; point `.specify/feature.json` at this feature dir                                           |
| 2    | Execute [`tasks.md`](./tasks.md) **Phases 8–12** (T030–T041) — **done**                                                                                  |
| 3    | **T041** + PR [#30](https://github.com/roalcantara/kodexb/pull/30) — **done** ([CI run](https://github.com/roalcantara/kodexb/actions/runs/27364457617)) |
| 4    | Merge PR; then T043 polish on `main` (nightly `smoke.yml` evidence post-merge)                                                                           |

---

## AC Evidence (update as tasks complete)

### Slice B

| ID        | Done when                                                                                                    | Evidence                                                                                                                   |
| --------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| SKO-2 AC1 | `default.yaml` stages bind to `mise run spec kit next` (or pinned verb); `pr-open` / `pr-check` rows present | `mise run catalog validate` · `conformance.script.spec.ts`                                                                 |
| SKO-3 AC1 | `spec workflow run` → `kit next --loop`; NDJSON stage events on non-dry-run                                  | `workflow_run.script.spec.ts`                                                                                              |
| SKO-5 AC2 | FIX in loop rewinds resolver to `implement` with fix handoff context                                         | `orchestrator.script.spec.ts`                                                                                              |
| SKO-6 AC2 | Terminal stdout includes run id + PR URL after `pr-open` / `pr-check`                                        | `spec_kit.script.spec.ts` or smoke transcript                                                                              |
| SKO-7 AC1 | Nightly smoke runs fixture through loop to gate                                                              | [`smoke.yml`](../../../../.github/workflows/smoke.yml) · local `spec test smoke` · nightly green on `main` after merge     |
| SKO-7 AC2 | `mise run spec test smoke` hits orchestrator scope on fixture                                                | `spec_test.script.spec.ts` · [PR CI](https://github.com/roalcantara/kodexb/actions/runs/27364457617) (review.yml Test job) |
| SKO-8 AC5 | `--loop` repeats until terminal or recoverable block                                                         | `spec_kit.script.spec.ts` loop tests                                                                                       |
| SKO-8 AC6 | Loop stdout includes run id + stage on each iteration                                                        | T041 dry-run / loop transcript                                                                                             |

### Slice A (reference — shipped)

| ID          | Evidence (still valid on `main`)                               |
| ----------- | -------------------------------------------------------------- |
| SKO-1       | `mise run spec kit` · `spec_kit.script.spec.ts`                |
| SKO-4       | `kit_envelope.script.spec.ts`                                  |
| SKO-8 AC1–4 | `kit_step_resolver.script.spec.ts` · `spec_kit.script.spec.ts` |

---

## Verify — Slice B (T041)

```sh
# Operator: --loop pauses at human gates (exit 1 = recoverable pause, use --approve to clear)
mise run spec kit next tools/__tests__/fixtures/workflow/smoke-feature --loop
mise run spec workflow run tools/__tests__/fixtures/workflow/smoke-feature --dry-run
# CI smoke: pre-seeds gate markers for unattended loop (SKO-7 AC1)
mise run spec test smoke
mise run catalog validate
bun test --config /dev/null packages/workflow-runtime/src/orchestrator.script.spec.ts
bun test --config /dev/null tools/governance/specs/workflow/conformance.script.spec.ts
bash .agents/skills/app-quality-gate/scripts/gate.sh
```

## Verify — Slice A regression (optional)

```sh
mise run spec kit
mise run spec kit next tools/__tests__/fixtures/workflow/smoke-feature --dry-run
bun test --config /dev/null tools/bin/spec_kit.script.spec.ts
bun test --config /dev/null packages/workflow-runtime/src/kit_step_resolver.script.spec.ts
```

---

## Touch list (Slice B)

| Area             | Files                                                                                                                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Catalog bindings | `assets/catalog/workflows/default.yaml`, `assets/catalog/catalog.yaml`                                                                                                                                        |
| Loop + alias     | `tools/bin/spec_kit.script.ts`, `tools/governance/specs/workflow_run.script.ts`                                                                                                                               |
| Orchestrator     | `packages/workflow-runtime/src/orchestrator.script.ts`                                                                                                                                                        |
| Smoke CI         | `.github/workflows/smoke.yml`, `tools/governance/specs/spec_test.script.ts`, `tools/governance/specs/smoke_harness.script.ts`, `packages/workflow-runtime/src/kit_smoke.script.ts`, `kit_verbs/*` smoke stubs |
| Tests            | `orchestrator.script.spec.ts`, `conformance.script.spec.ts`, `spec_kit.script.spec.ts`, `workflow_run.script.spec.ts`                                                                                         |

---

## Run artifacts (fill during dogfood)

| Run id                             | Slice | Phase | Artifact                                                                                                                                                   |
| ---------------------------------- | ----- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| *smoke-feature-1781196803373-57b7* | B     | loop  | `tmp/workflow-runs/2026-06-11/smoke-feature-1781196803373-57b7/*.envelope.*.json`                                                                          |
| *smoke-feature-1781197673380-b085* | B     | smoke | `mise run spec test smoke` exit 0 — terminal `pr-check`, PR stub URL                                                                                       |
| *f554c4af*                         | B     | ci    | [review.yml #171](https://github.com/roalcantara/kodexb/actions/runs/27364457617) — PR [#30](https://github.com/roalcantara/kodexb/pull/30) green (1m 34s) |
