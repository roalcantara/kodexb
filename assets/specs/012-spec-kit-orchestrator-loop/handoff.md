<!-- markdownlint-disable-file -->

# Handoff — Spec Kit orchestrator loop (`012`)

**Spec:** [`spec.md`](./spec.md) (SKO-1…SKO-8) · **Plan:** [`plan.md`](./plan.md) · **Tasks:** [`tasks.md`](./tasks.md)

**Branch (Slice A):** `feature/012-spec-kit-commands` · **Branch (Slice B):** `feature/012-spec-kit-orchestrator-loop`

**Predecessors:** [`009-agentic-workflow-orchestrator`](../009-agentic-workflow-orchestrator/) · [`010-workflow-packages`](../010-workflow-packages/) · [`011-mise-sdd-cli`](../011-mise-sdd-cli/) merged on `main`

**Status:** Ready for implementer — Slice A first

---

## Scope (two PRs)

| Slice | Branch                                   | Phases | Outcome                                                                        |
| ----- | ---------------------------------------- | ------ | ------------------------------------------------------------------------------ |
| **A** | `feature/012-spec-kit-commands`          | 1–7    | All kit verbs + `kit next` (single step, `--dry-run`, `--approve`) + envelopes |
| **B** | `feature/012-spec-kit-orchestrator-loop` | 8–12   | Profile rebind, `--loop`, `workflow run` alias, R2R, SMOKE-01                  |

**Out of band:** [`013-task-runner-tree-ux`](../013-task-runner-tree-ux/) — not a blocker.

---

## Implementer rules

| Rule                    | Detail                                                                                                                                          |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Plan wins on layout** | Module paths in [`plan.md` § Canonical step → handler traceability](./plan.md#canonical-step--handler-traceability) override older task wording |
| **Resolver**            | Use `kit_step_resolver.script.ts` for full canonical table — do **not** extend `detectPhase()` to 18 rows                                       |
| **Slice stop line**     | Complete **T029** (Slice A gate) and merge before starting Phase 8                                                                              |
| **Retro**               | Explicitly out of scope                                                                                                                         |

---

## Agent workflow

| Step | Action                                                                                    |
| ---- | ----------------------------------------------------------------------------------------- |
| 1    | Branch `feature/012-spec-kit-commands`; point `.specify/feature.json` at this feature dir |
| 2    | Execute [`tasks.md`](./tasks.md) Phases 1–7                                               |
| 3    | Run **T029** Slice A checkpoint; open PR 1                                                |
| 4    | After merge: branch `feature/012-spec-kit-orchestrator-loop`; Phases 8–12                 |
| 5    | Run **T041** Slice B checkpoint; open PR 2                                                |

---

## AC Evidence (update as tasks complete)

### Slice A

| ID               | Done when                                                                    | Evidence                                                        |
| ---------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------- |
| SKO-1 AC1        | `spec kit` lists all verbs including `pr-prep`; unknown verb → exit 2 | `mise run spec kit`                                      |
| SKO-1 AC2        | Routing accepts optional `[feature]` via `resolveActiveFeatureDir`           | `bun test --config /dev/null tools/bin/spec_kit.script.spec.ts` |
| SKO-1 AC3        | `--raw` / `--json` respected on kit output                                   | `spec_kit.script.spec.ts`                                       |
| SKO-4 AC1        | Each verb writes valid envelope under `tmp/workflow-runs/`                   | `kit_envelope.script.spec.ts` + verb specs                      |
| SKO-8 AC1        | Fixture at each phase resolves to expected verb                              | `kit_step_resolver.script.spec.ts`                              |
| SKO-8 AC2        | Runnable step dispatches verb once; gate blocks without `--approve`          | `spec_kit.script.spec.ts` preflight tests                       |
| SKO-8 AC3        | Blocked step prints resume hint; `--approve` clears gate                     | TTY/spec on stdout                                              |
| SKO-8 AC4        | `--dry-run` prints verb + hint; no spawn                                     | Parity vs `workflow_run --dry-run`                              |
| SKO-5 (handler)  | Review APPROVE/FIX envelope mapping                                          | `kit_verbs/review.script.spec.ts`                               |
| SKO-6 (handlers) | `gate`, `pr-prep`, `pr-open`, `pr-check` run Measure commands                | `kit_verbs/*.script.spec.ts`                                    |

### Slice B

| ID          | Done when                                              | Evidence                      |
| ----------- | ------------------------------------------------------ | ----------------------------- |
| SKO-2 AC1   | `default.yaml` stages bind to `mise run spec kit …`    | `conformance.script.spec.ts`  |
| SKO-3 AC1   | `spec workflow run` → `kit next --loop`; NDJSON events | `workflow_run.script.spec.ts` |
| SKO-5 AC2   | FIX in loop rewinds to `implement`                     | `orchestrator.script.spec.ts` |
| SKO-6 AC2   | Terminal message includes PR URL                       | Smoke transcript              |
| SKO-7 AC1   | SMOKE-01 green in CI                                   | `.github/workflows/smoke.yml` |
| SKO-8 AC5–6 | `--loop` to terminal; run id + stage in stdout         | T041 checkpoint               |

---

## Verify — Slice A (T029)

```sh
mise run spec kit
mise run spec kit next assets/specs/012-spec-kit-orchestrator-loop --dry-run
bun test --config /dev/null tools/bin/spec_kit.script.spec.ts
bun test --config /dev/null packages/workflow-runtime/src/kit_step_resolver.script.spec.ts
bash .agents/skills/app-quality-gate/scripts/gate.sh
```

## Verify — Slice B (T041)

```sh
mise run spec kit next tools/__tests__/fixtures/workflow/smoke-feature --loop
mise run spec workflow run tools/__tests__/fixtures/workflow/smoke-feature --dry-run
mise run spec test smoke
bash .agents/skills/app-quality-gate/scripts/gate.sh
```

---

## Run artifacts (fill during dogfood)

| Run id      | Slice | Phase | Artifact                       |
| ----------- | ----- | ----- | ------------------------------ |
| *(pending)* | A     | —     | `tmp/workflow-runs/…/*.ndjson` |
