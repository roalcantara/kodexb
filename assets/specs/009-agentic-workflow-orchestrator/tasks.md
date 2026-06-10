<!-- markdownlint-disable-file -->

# Tasks: Agentic workflow orchestrator (`009`)

**Input**: Design documents from `assets/specs/009-agentic-workflow-orchestrator/`
**Prerequisites**: [`plan.md`](./plan.md) (slice table, Architecture layers, Tasks authoring note), [`spec.md`](./spec.md) (AWO-1…AWO-13), [`research.md`](./research.md), [`data-model.md`](./data-model.md), [`contracts/`](./contracts/), [`review/002/tool-agnostic-engine-review.md`](./review/002/tool-agnostic-engine-review.md)

**Tests**: REQUIRED per Constitution Principle V (co-located `*.script.spec.ts`, no mocking, real file I/O + `mkdtemp` fixtures). Engine (L1) tests use **fixture profiles + stub commands** (`bun run fixtures/…`, `echo`) — never the kb toolchain.

**Organization**: by **slice** (independently shippable increment). Task IDs carry a **layer family** per the plan's Tasks authoring note: `ENGINE` (L1 pure) · `ADAPTER` (L2 I/O) · `PROFILE` (L3 catalog) · `CONFORMANCE` (kb Layer B) · `GUIDE` (guide promotion) · `CLI` (L4). `[Story]` tags map to the slice (`MVP`, `M1`, `M2`, `M3`, `M4`).

**Implementation home**: extend the existing tree at `tools/governance/specs/workflow/` (no `packages/` move, no `src/` changes). The L1 engine modules MUST NOT contain `mise`/`hk`/`bun`/`gh`/`speckit` identifiers in constants, defaults, or type names.

**Layer-B anchor — `detectPhase()` stage order** (from `orchestrated_handoff.script.ts`): `specify → plan → analyze-plan → tasks → analyze-tasks → handoff-generate → implement → review`. `default.yaml` stage ids MUST match this order.

---

## Phase 1: Setup (shared infrastructure)

**Purpose**: scaffolding shared by every slice. No requirement label.

- [X] SETUP-01 Add the `xstate` runtime dependency (`bun add xstate`) and record the pinned version in [`research.md`](./research.md) §xstate decision.
- [X] SETUP-02 [P] Create the schema home `tools/governance/specs/workflow/schemas/` and the fixtures dir `tools/__tests__/fixtures/workflow/` (synthetic feature-dir stubs + fixture profiles; never live `assets/specs/NNN-*`).
- [X] SETUP-03 [P] Create the perf-baseline destination `tools/metrics/baselines/workflow.json` (empty `{}` seed) for the NFR budgets.

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: promote the contract spikes into the implementation home. **⚠️ Blocks every slice.** No requirement label. Schemas land as code; `contracts/` then holds links, not duplicates.

- [X] FOUND-01 Promote [`contracts/state.schema.ts`](./contracts/state.schema.ts) → `tools/governance/specs/workflow/schemas/state.schema.ts` (TypeBox `PersistedRunState`; xstate snapshot stays opaque). Co-locate `state.schema.spec.ts` (round-trip + version literal).
- [X] FOUND-02 Replace the spike rows in [`contracts/README.md`](./contracts/README.md) with links to the promoted paths once the schema promotions land (no duplicate schema bodies in the spec folder).

---

## Phase 3: MVP slice — substrate (PR 1)

**Requirements**: AWO-2, AWO-9, AWO-10, AWO-4, AWO-12.
**Goal**: validated envelopes, the Executor adapter (profile-owned prefix policy), the profile loader, persistence (extending the existing NDJSON writer), and a Layer-B conformance test. **No `machine.ts`, no orchestrator actor — those are M1.**
**Independent test**: `bun test --config /dev/null tools/governance/specs/workflow/` is green for the schema/loader/adapter/conformance specs using fixture profiles; the orchestrator does not advance stages yet.

### ENGINE (L1 pure — no toolchain identifiers)

- [X] MVP-ENGINE-01 [P] [MVP] Promote [`contracts/envelope.schema.ts`](./contracts/envelope.schema.ts) → `tools/governance/specs/workflow/schemas/envelope.schema.ts` (the spike's `EvidenceEntry.kind` is already toolchain-neutral: `command | artifact | marker` — the L2 adapter runs a `command` ref; the engine stays runner-agnostic). Co-locate `envelope.schema.spec.ts` asserting the neutral kinds (no `mise_task`/`hk_profile`) + required fields. (AWO-2.1)
- [X] MVP-ENGINE-02 [MVP] Implement the pure evidence-evaluation function `evaluateEvidence(entries, ctx)` in `tools/governance/specs/workflow/evidence.ts` — for `marker`/`artifact` kinds it checks path presence; for `command` kind it returns a descriptor for the adapter to run (engine never spawns). Co-located spec covers pass/fail/missing per kind. (AWO-2.3, AWO-2.4)
- [X] MVP-ENGINE-03 [MVP] Implement the pure prefix-validation **algorithm** `validateExecutionPolicy(command, allowed_prefixes)` in `tools/governance/specs/workflow/execution_policy.ts` — **no prefix value constants**; returns matched/rejected + diagnostic. Co-located spec uses fixture prefixes (`bun run`, `echo`) only. (AWO-9.2 algorithm; review 002 §02)

### PROFILE (L3 catalog)

- [X] MVP-PROFILE-01 [P] [MVP] Promote [`contracts/profile.schema.ts`](./contracts/profile.schema.ts) → `tools/governance/specs/workflow/schemas/profile.schema.ts` verbatim of the tool-agnostic spike: required `ExecutionPolicy.allowed_prefixes` (minItems 1), **no `DEFAULT_COMMAND_ALLOWLIST`**, `sandbox` optional, `command:` opaque. Co-located `profile.schema.spec.ts`. (AWO-10.1, AWO-11.1)
- [X] MVP-PROFILE-02 [MVP] Implement `profile_loader.script.ts` — parse YAML (Bun), `Value.Check(ProfileSchema)`, **fail-fast when `execution_policy` is missing/empty** for a runnable profile, with actionable diagnostics. Co-located spec: valid, missing-`execution_policy`, empty-`allowed_prefixes`, malformed-YAML. (AWO-10.1, AWO-10.2)
- [X] MVP-PROFILE-03 [MVP] **Extend** the existing `WorkflowEvent` union in `tools/governance/specs/workflow/workflow_run.script.ts` with the 009 event types from [`contracts/events.schema.ts`](./contracts/events.schema.ts) (`task.invoked/completed`, `stage.*`, `transition.*`, `decision.*`, `run.summary`, `continuity.violation`, `schema.violation`, `shutdown.*`, `sandbox.violation`) as **additive members** — do NOT fork a second writer/union. Extend the spec to validate the new members. (AWO-12.2)
- [X] MVP-PROFILE-04 [MVP] Add the `workflows:` section to `assets/catalog/catalog.yaml` and commit `assets/catalog/workflows/default.yaml` with `execution_policy.allowed_prefixes: ["mise run", "hk check", "bun run"]` and a **minimal stage graph whose stage ids match `detectPhase()` order** (`specify, plan, analyze-plan, tasks, analyze-tasks, handoff-generate, implement, review`); `command:` values MAY be stubs until `PROFILE-SDD-*`. Ensure `mise run catalog validate` passes. (AWO-10, AWO-12.1)

### ADAPTER (L2 I/O — the only place `Bun.spawn` is allowed)

- [X] MVP-ADAPTER-01 [MVP] Implement the `Executor` port + `command_invoker.script.ts` (kb executor): `run(descriptor) → { exitCode, stdout, stderr, durationMs }` via `Bun.spawn`; applies the loaded profile's `execution_policy` using `validateExecutionPolicy` (MVP-ENGINE-03); rejects disallowed prefixes before spawn. Co-located spec uses fixture profiles. (AWO-9.1, AWO-9.2)
- [X] MVP-ADAPTER-02 [MVP] Add the ast-grep rule banning `Bun.spawn` / `Bun.$` / `child_process` **outside** `command_invoker.script.ts`, wired into `bun run lint:ast-grep`. Add a co-located test asserting an engine module with an inline spawn fails the rule. (AWO-9.1)
- [X] MVP-ADAPTER-03 [MVP] Emit `task.invoked` / `task.completed` via the existing `WorkflowRunWriter` (reuse — no new writer), capturing command string, exit code, duration. Co-located spec asserts NDJSON round-trips through `runs_cli`. (AWO-9.4)
- [X] MVP-ADAPTER-04 [MVP] Implement worker-envelope capture: read `tmp/workflow-runs/<date>/<run_id>.envelope.<stage>.json`, `Value.Check(EnvelopeSchema)`; a missing/invalid file surfaces a `BLOCKED` outcome with `COMMAND_TARGET_MISSING`/`SCHEMA_INVALID` — never a crash. Co-located spec: present-valid, absent, malformed. (AWO-2.2, AWO-5.1, AWO-9.3)
- [X] MVP-ADAPTER-05 [MVP] Implement persistence: extend `WorkflowRunWriter` usage to write the `PersistedRunState` snapshot (`<run_id>.state.json`, atomic rename) and dual-write the event tail to `tools/metrics/workflow-runs/<date>/<run_id>.ndjson` on terminal. Co-located spec covers snapshot rewrite + archive equivalence. (AWO-4.1, AWO-4.4) — **resume (AWO-4.2) is exercised in M1.**

### CONFORMANCE (kb Layer B)

- [X] MVP-CONFORMANCE-01 [MVP] `conformance.script.spec.ts` — load `assets/catalog/workflows/default.yaml`, assert its stage-id order is a superset matching `detectPhase()` order (compose `detectPhase()`; do NOT re-derive the order). (AWO-12.1)
- [X] MVP-CONFORMANCE-02 [P] [MVP] Policy-plumbing spec using **fixture profiles** with `bun run`/`echo` prefixes — matched, mismatched, whitespace; asserts zero `mise`/`hk`/`gh` literals appear in L1 modules (grep/ast-grep guard). (AWO-9.2; review 002 §03)

### GUIDE (promotion — per spec guide-promotion checklist)

- [X] MVP-GUIDE-01 [P] [MVP] Promote the envelope + event-extension contract into [`OBSERVABILITY_GUIDE.md`](../../guides/OBSERVABILITY_GUIDE.md) (event-extension section references the promoted code path, not the spec folder). (AWO-2, AWO-12.2)
- [X] MVP-GUIDE-02 [P] [MVP] Create `assets/guides/WORKFLOW_GUIDE.md` stub: profile shape, `execution_policy`, and the **kb profile-authoring convention** (`mise = verbs / hk = events`) as L3 authoring guidance — explicitly not an engine API. Add it to the `CLAUDE.md` guide index. (AWO-10; review 002 §B)

### MVP closeout

- [X] MVP-CLOSEOUT-01 [MVP] Run `bun test --config /dev/null tools/governance/specs/workflow/` and `mise run spec lint assets/specs/009-agentic-workflow-orchestrator`; then `mise run spec gate`. All green before the slice is considered done.

**Checkpoint**: schemas, profile loading + `execution_policy` validation, Executor adapter, persistence, and Layer-B conformance are green — with **no** toolchain defaults in engine modules and **no** state machine yet.

---

## Phase 4: M1 slice — first orchestration (PR 2)

**Requirements**: AWO-1, AWO-5, AWO-13.
**Goal**: auto-progression on the proven substrate, seam dispatch, graceful shutdown + resume.
**Independent test**: a fixture-profile run auto-advances `DONE`+evidence stages, pauses on `NEED_INPUT`/`human_gated`, and a SIGINT mid-stage produces a consistent resumable snapshot.

### ENGINE (L1)

- [X] M1-ENGINE-01 [M1] Implement `machine.ts` — pure xstate definition + named guards encoding the transition precedence (policy gate → human approval → evidence verify → auto-advance). Guards consume pure inputs (envelope status + `evaluateEvidence` result); no spawn, no toolchain strings. Co-located spec drives the guard matrix. (AWO-1.1, AWO-2.3)
- [X] M1-ENGINE-02 [M1] Add side-effect (teardown) actors spawned fire-and-forget with bounded timeout (`teardown_timeout_ms`, default 30s); they emit `task.*` and never gate the next transition. Co-located latency + timeout-injection spec. (AWO-5.5)
- [X] M1-ENGINE-03 [M1] Implement snapshot persist/hydrate helpers (`getPersistedSnapshot` wrap, `createActor({ snapshot })`) over `PersistedRunState`. Co-located spec: mid-`evidence_pending` and mid-`retrying` rehydrate. (AWO-4.2)

### ADAPTER (L2)

- [X] M1-ADAPTER-01 [M1] Implement `orchestrator.script.ts` — the actor wiring machine + Executor + writer; dispatches workers at documented seams (`implement-src`, `gherkin-bdd-handoff`, `review-fix`) via profile `command:` only (no inline `speckit.*`). Static check asserts no inline `speckit.*`. (AWO-5.1)
- [X] M1-ADAPTER-02 [M1] Implement the graceful-shutdown trap (SIGINT/SIGTERM): transition in-flight stage to `blocked` + `SHUTDOWN_REQUESTED`, bounded grace period, atomic snapshot before exit, honor worker `idempotency_key` on resume (no double-dispatch). Co-located signal-injection + resume spec. (AWO-13.1–13.4)

### CLI (L4)

- [X] M1-CLI-01 [M1] **Resolve `spec resume` vs `spec workflow resume` naming**: decide the canonical subcommand (recommend `mise run spec workflow resume` for namespace consistency), document the decision in `WORKFLOW_GUIDE.md`, and reconcile every spec/plan reference (spec.md AWO-3 AC4, AWO-5 AC4 currently say `spec workflow resume`). Add `ALLOWED_WORKFLOW_NAMES` guard.
- [X] M1-CLI-02 [M1] Implement `resume [<run_id>] --answer <qid>=<value>` / `--approve <stage>` routing in `tools/bin/spec.script.ts`: `<run_id>` defaults to the single active run, errors with candidate list when ambiguous; hydrates snapshot, applies to shared memory, auto-resumes. Co-located spec covers default-resolution + ambiguous error. (AWO-3.4, AWO-5.4)

### M1 closeout

- [X] M1-CLOSEOUT-01 [M1] `bun test --config /dev/null tools/governance/specs/workflow/` + `mise run spec lint assets/specs/009-agentic-workflow-orchestrator` + `mise run spec gate`.

**Checkpoint**: the orchestrator advances, pauses, resumes, and shuts down cleanly on fixture profiles.

---

## Phase 5: M2 slice — intervention + memory (PR 3)

**Requirements**: AWO-3, AWO-7.

- [X] M2-ENGINE-01 [M2] Implement the intervention minimizer + question dedup (against run-shared memory) and the `decision.defaulted` path. Co-located spec for dedup + default logging. (AWO-3.1, AWO-3.2, AWO-3.3)
- [X] M2-PROFILE-01 [M2] Implement `memory.script.ts` — stage-scoped (`<run_id>.memory.<stage>.json`) + run-shared (`<run_id>.shared.json`) read/write, conflict policy enum (`prefer_latest | prompt_user | block`), retention knobs. Co-located spec per conflict mode + retention. (AWO-7.1–7.4)
- [X] M2-RESUME-01 [M2] Complete `--answer` handler in `workflow_run.script.ts`: read/write shared memory, emit `decision.answered`, send `INPUT.ANSWERED`, update snapshot. (AWO-3.4)
- [X] M2-GUIDE-01 [P] [M2] Add the memory model + retention section to `WORKFLOW_GUIDE.md`. (AWO-7)
- [X] M2-CLOSEOUT-01 [M2] `bun test … tools/governance/specs/workflow/` + spec lint + `mise run spec gate`.

---

## Phase 6: M3 slice — PR/CI completion (Post-MVP, PR 4)

**Requirements**: AWO-6. **Not blocking the first PRs.**

- [X] M3-PROFILE-01 [M3] Add `providers.{pr_open,pr_update,ci_status}` `command:` bindings to `default.yaml` (kb: `gh pr create` / `gh pr edit` / `gh pr checks`) + PR-prep stage. (AWO-6.1, AWO-6.2)
- [X] M3-ADAPTER-01 [M3] Implement the CI-status gate (terminal success requires the bound `ci_status` exit 0) and the R2R remediation loop using the profile retry policy. Co-located spec with stubbed status providers (green/pending/failing) + failing-then-passing. (AWO-6.3, AWO-6.4)
- [X] M3-GUIDE-01 [P] [M3] Add **Orchestrator PR/CI bindings** to [`CI_GUIDE.md`](../../guides/CI_GUIDE.md) (provider fields, pr-prep stage, CI gate, swapping providers via profile only).
- [X] M3-CLOSEOUT-01 [M3] `bun test … ` + spec lint + `mise run spec gate`.

---

## Phase 7: M4 slice — retrospective + sandbox (Post-MVP, PR 5+)

**Requirements**: AWO-8, AWO-11. **Not blocking the first PRs.**

- [X] M4-ENGINE-01 [M4] Implement the retrospective stage: write `tools/metrics/workflow-runs/<date>/<run_id>.retro.md` (blockers/retries/interventions/patterns) + ranked recommendations referencing `event.id`s. (AWO-8.1, AWO-8.2)
- [X] M4-PROFILE-01 [M4] Append cross-run insights to `assets/catalog/agent_memory.yaml` (create on first use; timestamp + `run_id` + `insight_id`) and load them at startup into stage-scoped memory. (AWO-8.3, AWO-8.4)
- [X] M4-ADAPTER-01 [M4] Implement optional-`sandbox` enforcement at the dispatcher boundary (tool allowlist, fs scope, secret-handling, network); blocked actions surface `SANDBOX_VIOLATION` + emit `sandbox.violation`; `passthrough` requires `acknowledged_unsafe`. Co-located violation-injection spec per dimension. (AWO-11.1–11.4)
- [X] M4-CLOSEOUT-01 [M4] `bun test … ` + spec lint + `mise run spec gate`.

---

## Phase 8: Polish & cross-cutting

- [X] POLISH-01 [P] Implement the optional `profile_guide_crossref.script.ts` lint (AWO-12.3): assert each safety `command:` in `default.yaml` is documented in [`SECURITY_GUIDE.md`](../../guides/SECURITY_GUIDE.md). Not engine core; optional.
- [X] POLISH-02 [P] Populate `tools/metrics/baselines/workflow.json` with the NFR budgets (transition ≤50ms, profile load ≤100ms, event append ≤5ms, cold resume ≤250ms) and a perf harness under `tools/metrics/harnesses/`. (NFRs)

---

## Optional (non-blocking — never gate an MVP/engine merge)

- [ ] PROFILE-SDD-01 [P] Fill `assets/catalog/workflows/default.yaml` with the real kb `command:` bindings (replace stubs) for each SDD stage (`mise run spec …`, `hk check --profile …`).
- [ ] SMOKE-01 [P] Dogfood integration: drive a real feature dir through `mise run spec gate` via the orchestrator. **Nightly/CI only**; uses real `mise`+`hk`; MUST NOT live in engine unit tests or block MVP. (review 002 §04)

---

## Dependencies & execution order

- **Phase 1 → Phase 2** before any slice.
- **MVP (Phase 3)** before **M1 (Phase 4)** — M1's machine/actor build on the proven schemas + adapter + persistence.
- **M2 (Phase 5)** after M1. **M3/M4** are Post-MVP and independent of each other; both depend on M1.
- **Polish** and **Optional** never block a slice merge.
- Within a slice, `[P]` tasks touch different files and may run in parallel; `*-CLOSEOUT-*` runs last.

## Parallel execution example (MVP)

```text
# After Phase 2, these MVP tasks touch different files and can run together:
MVP-ENGINE-01  (envelope schema + neutral EvidenceEntry kinds)
MVP-PROFILE-01 (profile schema promotion)
MVP-GUIDE-01   (OBSERVABILITY promotion)
MVP-GUIDE-02   (WORKFLOW_GUIDE stub)
# Then ENGINE-02/03, PROFILE-02/03/04, ADAPTER-01..05 serialize where they share files.
```

## Implementation strategy

Ship **MVP first** as the contracts-and-storage walking skeleton (no state machine), then **M1** for first real orchestration, then **M2**. **M3/M4 are Post-MVP.** Engine work (`ENGINE-*`) never depends on kb toolchain wiring; `PROFILE-SDD-*` and `SMOKE-*` are deferred and non-blocking. Keep L1 free of `mise`/`hk`/`bun`/`gh` identifiers throughout.

---

## Reconciliation notes (2026-06-03)

Checkbox audit against `tools/governance/specs/workflow/` after M4 merge prep. Phases 1–3, 5–7 were already accurate; **Phase 4 (M1)** was stale (work landed across M1–M4 PRs without updating `tasks.md`).

### Marked `[X]` (verified in tree)

| Task           | Evidence                                                                                  |
| -------------- | ----------------------------------------------------------------------------------------- |
| M1-ENGINE-01   | `machine.script.ts` + `machine.script.spec.ts` (guards, AWO-1/2/5/13 matrix)              |
| M1-ENGINE-03   | `snapshot.script.ts`; `orchestrator.script.spec.ts` AWO-4 AC2 persist/hydrate             |
| M1-ADAPTER-01  | `orchestrator.script.ts` wires machine + invoker + writer; no `speckit.*` in orchestrator |
| M1-CLOSEOUT-01 | Workflow suite + spec lint/gate green through M4 closeout                                 |

### Completed (this PR)

| Task               | Status  | Note                                                                                                                                          |
| ------------------ | ------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **M1-ENGINE-02**   | Done    | `teardown_runner.script.ts` + `command_invoker.script.ts` `runCommandAsync`; `AWO-5.5` latency/timeout specs in `orchestrator.script.spec.ts` |
| **M1-ADAPTER-02**  | Done    | `orchestrator_resume.script.ts` seed key fix + `AWO-13.1`/`13.3` specs in `orchestrator.script.spec.ts`                                       |
| **M1-CLI-01**      | Done    | Resume naming in `WORKFLOW_GUIDE.md`                                                                                                          |
| **M1-CLI-02**      | Done    | `findActiveRun`/`listActiveRuns` in `spec.script.ts` + specs in `spec.script.spec.ts`                                                         |
| **POLISH-01**      | Done    | `profile_guide_crossref.script.ts` + spec                                                                                                     |
| **POLISH-02**      | Done    | NFR budgets in `workflow.json`; harness in `tools/metrics/harnesses/workflow/`                                                                |

### Partial / deferred to 010

| Task               | Note |
| ------------------ | ---- |
| **PROFILE-SDD-01** | Only specify evidence + handoff post-trigger done; full per-stage bindings → 010 |
| **SMOKE-01**       | Smoke spec gate only; full orchestrator dogfood → 010 |
| `packages/*`       | Package extraction → 010 |

### Closeout plan (2026-06-03, revised)

If the table above still shows gaps after the 009 PR lands, fix on 009 (hotfix), not by expanding 010.
