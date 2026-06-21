<!-- markdownlint-disable-file -->

# Spec Kit orchestrator loop

**Feature Branch**: `feature/012-spec-kit-orchestrator-loop`
**Release**: v0.x
**Status**: Draft

**Input**: Close the automation gap after **009** (orchestrator engine), **010** (packages + PROFILE-SDD-01 / SMOKE-01), and **011** (mise SDD hub). Operators already run the SDD cycle manually (`speckit.*` in chat + `mise run spec workflow run` phase hints). This feature wires **profile-bound mise tasks** into the **Orchestrator auto-advance loop** so one command advances stage-by-stage until terminal gate (PR green, ready for manual app testing). **Retrospective / agent_memory pinning (009 AWO-8) deferred.**

## Introduction

The kb workflow engine (009) intentionally never calls `speckit.*` directly. It spawns opaque `command:` strings from `assets/catalog/workflows/default.yaml` via the **Executor** adapter. Today those bindings are incomplete and `mise run spec workflow run` uses **phase probing** only — it prints the next Spec Kit step instead of driving the xstate **Orchestrator**.

This feature adds **`mise run spec kit <verb>`** — thin mise wrappers that mirror `.specify/workflows/orchestrated-handoff/workflow.yml` one-to-one — plus **`mise run spec kit next`**, the **default operator entry**: resolve the next verb from feature state, preflight whether it is runnable, and dispatch it. Repeated `kit next` (or `kit next --loop`) closes the loop with envelope + evidence until pause or terminal gate. The orchestrator engine spawns `mise run spec kit next` (or individual verbs) from profile bindings.

**Predecessors:** [`009`](../009-agentic-workflow-orchestrator/spec.md) engine · [`010`](../010-workflow-packages/spec.md) PROFILE-SDD-01 / SMOKE-01 · [`011`](../011-mise-sdd-cli/spec.md) CLI hub.

**Non-blocker:** [`013`](../013-task-runner-tree-ux/spec.md) tree UX spike — independent of orchestration correctness.

## Authority

| Topic                             | Authority                                                                                                               |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Orchestrator glossary & AWO rules | [`009` spec](../009-agentic-workflow-orchestrator/spec.md) § Glossary, AWO-1/2/5/6                                      |
| Spec Kit step order               | [`.specify/workflows/orchestrated-handoff/workflow.yml`](../../../.specify/workflows/orchestrated-handoff/workflow.yml) |
| Phase / file-set detector         | [`orchestrated_handoff.script.ts`](../../../packages/workflow-runtime/src/orchestrated_handoff.script.ts)               |
| Profile catalog                   | [`assets/catalog/workflows/default.yaml`](../../catalog/workflows/default.yaml)                                         |
| Review seam                       | [`.agents/skills/app-review-handoff/SKILL.md`](../../../.agents/skills/app-review-handoff/SKILL.md)                     |
| SDD operator guide                | [`WORKFLOW_SDD_GUIDE.md`](../../guides/WORKFLOW_SDD_GUIDE.md)                                                           |

## Out of scope

- Retrospective stage, `agent_memory.yaml` pinning, run analytics dashboard (009 AWO-8 — follow-on)
- Task runner tree pretty mode ([`013`](../013-task-runner-tree-ux/spec.md))
- Replacing Cursor / opencode as the LLM runtime behind kit verbs (kit dispatches; agents execute)
- Unattended auto-commit without operator policy (commit step may invoke hooks; secrets stay gated)
- Greenfield `spec init` from a raw prompt in v1 (operator supplies feature dir or runs `spec init` first)
- Changing 009 L1 purity rules (no `speckit` strings in `packages/workflow-core`)

## Glossary

Terms align with [`009` § Glossary](../009-agentic-workflow-orchestrator/spec.md#glossary).

| Term                  | Meaning                                                                                         |
| --------------------- | ----------------------------------------------------------------------------------------------- |
| **Kit verb**          | A subcommand under `mise run spec kit …` mapping 1:1 to a Spec Kit or kb tail step              |
| **Kit next**          | Resolver + dispatcher: pick the next kit verb from feature/run state and invoke it if runnable  |
| **Stage command**     | Profile `command:` string; normatively `mise run spec kit next` (or explicit `kit <verb>`)      |
| **Orchestrator loop** | xstate actor: dispatch stage → read envelope → verify evidence → transition until terminal      |
| **Envelope**          | Worker outcome at `tmp/workflow-runs/<date>/<run_id>.envelope.<stage>.json`                     |
| **Review-fix loop**   | Review worker FAIL → fix handoff → re-dispatch implement until evidence green                   |
| **Human gate**        | Pause before next kit verb; cleared by operator `--approve` or `spec workflow resume --approve` |

## Workflow flow and kit verb contract

This section is **normative for 012** — `plan.md` stage handlers and `default.yaml` bindings MUST trace to these rows. **`kit next`** resolves the first row whose **done-when** is not satisfied (see § Kit verb reference). Spec Kit YAML human gates become **`kit next` preflight pauses** unless `--approve`.

### Operator entrypoints

| Command                                   | Role                                                    |
| ----------------------------------------- | ------------------------------------------------------- |
| `mise run spec kit next [feature]`        | **Default** — resolve, preflight, run **one** next verb |
| `mise run spec kit next [feature] --loop` | Repeat until pause or terminal                          |
| `mise run spec workflow run [feature]`    | Alias for `kit next --loop`                             |
| `mise run spec kit <verb> [feature]`      | Force a specific verb (debug, re-run, tests)            |

### Canonical step sequence

Order matches [orchestrated-handoff `workflow.yml`](../../../.specify/workflows/orchestrated-handoff/workflow.yml) through implement, then kb **tail** (pr-prep → review → gate → PR). File-set phases from [`detectPhase()`](../../../packages/workflow-runtime/src/orchestrated_handoff.script.ts) shown in **Detector** column.

```text
specify → [gate: review-spec] → clarify → checklist → plan → [gate: review-plan]
  → analyze (plan pass) → tasks → [gate: review-tasks] → analyze (tasks pass)
  → [gate: review-handoff] → handoff-generate? → implement → pr-prep → review
  → gate → pr-open → pr-check → DONE (manual app test)
```

| #   | Step id          | Mise task                                | Detector phase     | Kind  | Done when (summary)                                                                                   |
| --- | ---------------- | ---------------------------------------- | ------------------ | ----- | ----------------------------------------------------------------------------------------------------- |
| 0   | *(bootstrap)*    | `mise run spec init`                     | —                  | kb    | Feature dir + `spec.md` exist (greenfield only)                                                       |
| 1   | specify          | `mise run spec kit specify`              | `specify`          | LLM   | `spec.md` exists; spec lint strict-ready                                                              |
| 2   | review-spec      | *(gate — not a kit verb)*                | —                  | gate  | Operator `--approve` after reading `spec.md`                                                          |
| 3   | clarify          | `mise run spec kit clarify`              | —                  | LLM   | Clarifications resolved; no open `[NEEDS CLARIFICATION]` in spec                                      |
| 4   | checklist        | `mise run spec kit checklist`            | —                  | LLM   | `checklists/requirements.md` exists and checklist complete                                            |
| 5   | plan             | `mise run spec kit plan`                 | `plan`             | LLM   | `plan.md` exists                                                                                      |
| 6   | review-plan      | *(gate)*                                 | —                  | gate  | Operator `--approve` after reading `plan.md`                                                          |
| 7   | analyze-plan     | `mise run spec kit analyze --pass plan`  | `analyze-plan`     | LLM   | `checklists/analyze-plan.md` exists                                                                   |
| 8   | tasks            | `mise run spec kit tasks`                | `tasks`            | LLM   | `tasks.md` + `handoff.md` exist                                                                       |
| 9   | review-tasks     | *(gate)*                                 | —                  | gate  | Operator `--approve` after reading `tasks.md` + `handoff.md`                                          |
| 10  | analyze-tasks    | `mise run spec kit analyze --pass tasks` | `analyze-tasks`    | LLM   | `checklists/analyze-tasks.md` exists                                                                  |
| 11  | review-handoff   | *(gate)*                                 | —                  | gate  | Gherkin handoff emitted if manifest requires it; operator `--approve`                                 |
| 12  | handoff-generate | `mise run spec kit handoff-generate`     | `handoff-generate` | kb    | `tmp/handoffs/opencode-{slug}-gherkin.md` when manifest includes `gherkin-bdd-handoff`; else **skip** |
| 13  | implement        | `mise run spec kit implement`            | `implement`        | LLM   | `checklists/implement-done.md` exists; feature Evidence commands pass                                 |
| 14  | pr-prep          | `mise run spec kit pr-prep`              | `pr-prep`          | shell | `hk check --profile pr` exits 0                                                                       |
| 15  | review           | `mise run spec kit review`               | —                  | kb    | Review envelope `APPROVE`; FIX loops to implement (SKO-5)                                             |
| 16  | gate             | `mise run spec kit gate`                 | `gate`             | shell | `mise run spec gate` + `bash .agents/skills/app-quality-gate/scripts/gate.sh` exit 0                  |
| 17  | pr-open          | `mise run spec kit pr-open`              | —                  | shell | PR created; ref persisted under run dir                                                               |
| 18  | pr-check         | `mise run spec kit pr-check`             | —                  | shell | Required CI checks green (`gh pr checks --watch`)                                                     |
| —   | terminal         | `kit next` message                       | —                  | —     | Operator notified: run id, PR URL, **all stages complete — ready for manual testing**                 |

**Note:** Rows marked **—** under Detector are Spec Kit or kb steps not yet separate rows in `detectPhase()`; **`kit next` v1 MUST extend resolution** to this full table (not only the condensed detector phases). Until then, plan documents the migration from condensed → full order.

### Kit verb reference (Goal · Measure · Evidence)

Each verb MUST write a stage **envelope** (SKO-4) on completion. LLM verbs dispatch the matching Spec Kit integration (`/speckit-*` in Cursor or configured provider); the handler does not parse chat stdout as authority.

#### `kit next`

- **Goal:** Resolve the next row in § Canonical step sequence, preflight blockers, dispatch that verb once (or loop with `--loop`).
- **Measure:** Same fixture at step *N* always resolves to verb *V*; blocked human gate never spawns worker without `--approve`.
- **Evidence:** `spec_kit.script.spec.ts` phase→verb matrix; parity with `workflow_run --dry-run`.

#### `kit specify`

- **Goal:** Create or refresh `spec.md` from operator input (feature description or resume context).
- **Measure:** `spec.md` present; `mise run spec lint [feature] --strict` exit 0.
- **Evidence:** Feature dir fixture after specify; envelope `status: DONE`; lint command in envelope `evidence[]`.

#### `kit clarify`

- **Goal:** Run Spec Kit clarify; resolve or encode answers into `spec.md` (infer when unambiguous).
- **Measure:** Zero `[NEEDS CLARIFICATION]` markers remain in `spec.md`.
- **Evidence:** `spec.md` diff; envelope DONE.

#### `kit checklist`

- **Goal:** Generate/update `checklists/requirements.md` from `spec.md`.
- **Measure:** Checklist file exists; spec quality checklist items satisfied per Spec Kit rules.
- **Evidence:** File presence; `mise run spec lint` on feature.

#### `kit plan`

- **Goal:** Produce `plan.md` — design contract, touch list, traceability to spec requirements.
- **Measure:** `plan.md` exists; `mise run spec trace [feature] --strict` exit 0.
- **Evidence:** Trace command output; envelope DONE.

#### `kit analyze` (`--pass plan|tasks`)

- **Goal:** Cross-artifact consistency pass (`/speckit-analyze`) after plan or after tasks+handoff.
- **Measure:** **Plan pass:** `checklists/analyze-plan.md` exists. **Tasks pass:** `checklists/analyze-tasks.md` exists.
- **Evidence:** Checklist marker files; envelope references analyze pass id.

#### `kit tasks`

- **Goal:** Produce ordered `tasks.md` and acceptance tracker `handoff.md`.
- **Measure:** Both files exist; handoff AC table has Evidence column populated for implementable rows.
- **Evidence:** File set scan; `orchestrated_handoff.script.spec.ts` tasks-without-handoff guard.

#### `kit handoff-generate`

- **Goal:** Emit worker handoff for Gherkin/BDD when manifest requires `gherkin-bdd-handoff` (opencode focus).
- **Measure:** Skip with envelope `SKIPPED` when manifest omits gherkin; else `tmp/handoffs/opencode-{slug}-gherkin.md` exists.
- **Evidence:** Manifest probe tests; handoff path in envelope `artifacts_created[]`.

#### `kit implement`

- **Goal:** Primary implementer executes `tasks.md` under FCIS rules; co-located specs; no scope drift.
- **Measure:** `checklists/implement-done.md` exists; handoff Evidence commands for completed rows exit 0.
- **Evidence:** Marker file; envelope DONE with task completion summary.

#### `kit pr-prep`

- **Goal:** Run PR preflights and checks (specifically `hk check --profile pr`) before requesting review.
- **Measure:** `hk check --profile pr` exits 0.
- **Evidence:** Envelope DONE.

#### `kit review`

- **Goal:** Read-only reviewer (`app-review-handoff`) verifies AC Evidence, diff vs contract, project guidelines.
- **Measure:** Envelope verdict `APPROVE` or `FIX`; FIX includes `tmp/handoffs/review-*` path.
- **Evidence:** Review envelope; Evidence command exit codes recorded in envelope.

#### `kit gate`

- **Goal:** Deterministic closeout before PR — spec traceability + full quality gate.
- **Measure:** `mise run spec gate [feature]` and `bash .agents/skills/app-quality-gate/scripts/gate.sh` both exit 0.
- **Evidence:** Task runner report or gate log; envelope DONE.

#### `kit pr-open`

- **Goal:** Create PR with conventional title/body; link run id for traceability.
- **Measure:** `gh pr create` exit 0; PR URL captured in run dir.
- **Evidence:** `providers.pr_open` telemetry; persisted `pr_ref` file.

#### `kit pr-check`

- **Goal:** Watch required CI checks until green or retry budget exhausted (default: 3 attempts, 30s linear backoff; overridable via profile `ci.retry`).
- **Measure:** `gh pr checks --watch --required` exit 0 within configured retry policy.
- **Evidence:** CI provider events in NDJSON tail; envelope DONE on green.

### Drift prevention

1. **`plan.md` MUST include a traceability table** copying § Canonical step sequence with handler module paths.
2. **Adding or reordering kit verbs** requires updating this section and `conformance.script.spec.ts` in the same PR.
3. **Profile `default.yaml` stage ids** MUST remain aligned with **Detector** column where present; kb tail stages use explicit ids (`review`, `pr-prep`, `gate`).

## Clarifications

### Session 2026-06-03

- Q: Why `spec kit` nested under `spec`? → A: Keeps the 011 SDD hub unified; profile allowlist already includes `mise run`; orchestrator spawns one opaque prefix per stage.
- Q: Does `kit analyze` cover both analyze passes? → A: **Yes**, with `--pass plan|tasks` (or separate profile stage ids `analyze-plan` / `analyze-tasks` bound to the same script with env). Plan phase owns exact flag.
- Q: Is retrospective required for “loop until PR green”? → A: **No.** Terminal success = gate evidence + CI provider pass + operator notified. Retro deferred.
- Q: Relationship to 010 PROFILE-SDD-01? → A: **012 completes it** — bindings become `mise run spec kit …` instead of stubs; SMOKE-01 uses the wired loop.
- Q: Why both explicit kit verbs and `kit next`? → A: Verbs are the **stable building blocks** (profile bindings, tests, forced re-run). **`kit next` is what operators run day-to-day** — it wraps `detectPhase()` + orchestrator preflight + dispatch of the resolved verb.
- Q: One `kit next` or loop until done? → A: Default **`kit next` = one step**. **`kit next --loop`** (and `spec workflow run`) repeat until `NEED_INPUT`, human gate, or terminal success — same semantics as the 009 orchestrator loop.
- Q: Full YAML order vs condensed `detectPhase()`? → A: **§ Workflow flow and kit verb contract is authoritative** for operator order; `kit next` MUST implement the full table. Condensed detector remains for backward-compatible dry-run until extended.

### Session 2026-06-10

- Q: How does the orchestrator transition back to the `implement` stage upon a failed review (verdict: `FIX`)? → A: The orchestrator runtime (specifically `mise run spec kit next`) handles stage resolution and rewinds externally based on the file/feature state without modifying the core `workflowMachine` state machine.
- Q: How should the review verdict and the fix handoff file path be represented in the completed review envelope? → A: Map APPROVE → `status: "DONE"`, and FIX → `status: "RETRYABLE_FAILURE"`. The fix handoff path is listed in `artifacts_created` and mirrored in `evidence[]` as `kind: "artifact"`. Diagnostics use codes `REVIEW_APPROVE` / `REVIEW_FIX_REQUIRED`. `EnvelopeSchema` remains unchanged in v1.
- Q: How should `kit next` handle a pending human gate, and how does the operator clear it? → A: `kit next` resolves directly to the gate stage itself (e.g. `review-spec`), prints the resume hint, and exits non-zero. The operator can clear it using `mise run spec kit next --approve` as the primary path, or `spec workflow resume --approve <runId>` when a persisted run exists.
- Q: Should `pr-open` and `pr-check` be registered as explicit stages in the workflow profile, or remain external providers? → A: Register them as standard stages in `default.yaml` with transitions `gate` → `pr-open` → `pr-check`, deprecating the post-loop `runProviders` execution in v1.
- Q: How should `pr-prep` be integrated into the canonical step sequence? → A: Add `pr-prep` explicitly to the canonical step sequence diagram and table in `spec.md` between `implement` and `review` as a kit verb/stage.
- Q: Is the `pr-prep` subcommand included in the `spec kit` CLI verb list? → A: Yes, `pr-prep` is included as a canonical kit verb in the subcommand help list between `implement` and `review`.
- Q: What is the retry and backoff policy for `kit pr-check`? → A: The orchestrator uses a retry policy of `max_attempts` = 3 with a constant 30s polling interval for GH checks (configured in the profile/defaults).
- Q: How does the LLM verb dispatch seam integration work? → A: LLM verb handlers invoke the configured provider's command (e.g. Cursor `/speckit-*` slash command or CLI) and expect the corresponding stage envelope JSON file to be written to disk on completion.
- Q: How does single-step `kit next` detect and handle terminal success? → A: When the step resolver finds no remaining steps, `kit next` prints "all stages complete — ready for manual testing" and exits with code 0.
- Q: What is the logging policy for runtime modules and CLI router? → A: Follow Principle VIII and use getLogger from `@shared/logging` to output resolver and envelope diagnostics.

---

## REQUIREMENT SKO-1: `spec kit` mise subcommand tree

**Slice:** A — Kit commands

**User story:** As an operator, I want one mise namespace that mirrors the Spec Kit workflow so profile bindings stay obvious.

### Acceptance criteria

1. WHEN the operator runs `mise run spec kit`, THEN mise SHALL list kit verbs per **§ Kit verb reference**: `next`, `specify`, `clarify`, `checklist`, `plan`, `analyze`, `tasks`, `handoff-generate`, `implement`, `pr-prep`, `review`, `gate`, `pr-open`, `pr-check` — with **`next` documented as the recommended default**.
   - **Measure:** Each verb documented in help; unknown verb exits 2.
   - **Evidence:** `tools/bin/spec.script.spec.ts` route cases; manual `mise run spec kit`.

2. WHEN dispatch runs `mise run spec kit <verb>`, THEN `tools/bin/spec.script.ts` (or dedicated `spec_kit.script.ts`) SHALL route to a co-located handler that accepts optional positional `[feature]` (same resolution as 011 `resolveActiveFeatureDir`).
   - **Measure:** Omitted feature resolves via `.specify/feature.json`; invalid dir exits non-zero with actionable message.
   - **Evidence:** Co-located `spec_kit.script.spec.ts`.

3. WHEN `--raw` or `--json` global flags are set on `spec`, THEN kit handlers SHALL respect render mode for machine-oriented sub-output where applicable (envelope path echo, exit codes).
   - **Measure:** `--json` emits structured envelope summary on success paths in tests.
   - **Evidence:** `spec_kit.script.spec.ts`.

---

## REQUIREMENT SKO-8: `spec kit next` — resolve, preflight, dispatch

**Slice:** A — Kit commands (single-step `next`; see SKO-8 AC5–6 for Slice B)

**User story:** As an operator, I want a single command that runs the next appropriate kit step so I never memorize the SDD phase order.

### Acceptance criteria

1. WHEN the operator runs `mise run spec kit next [feature]`, THEN the handler SHALL resolve the next step per **§ Canonical step sequence** (including clarify, checklist, and human gates), supplemented by orchestrator snapshot when resuming.
   - **Measure:** Fixture dirs at each phase map to the expected verb (`specify`, `plan`, `tasks`, `implement`, `gate`, …).
   - **Evidence:** `spec_kit.script.spec.ts` phase→verb table tests reusing `orchestrated_handoff` fixtures.

2. WHEN the resolved verb is runnable (preflight passes: allowlist, sandbox, execution_policy, no unresolved human gate unless `--approve`, worker timeout not exhausted), THEN `kit next` SHALL dispatch **`mise run spec kit <verb>`** (internal delegate, not a second operator invocation) and exit with that verb's exit code.
   - **Measure:** Runnable `plan` fixture invokes plan handler once; blocked human gate exits without spawn unless `--approve`.
   - **Evidence:** Co-located preflight + dispatch specs.

3. WHEN preflight fails with a recoverable blocker (human gate, `NEED_INPUT`, missing envelope), THEN `kit next` SHALL print the resolved verb, blocker reason, and resume hint (`spec kit next --approve` or `spec workflow resume --approve <runId>`) and exit non-zero without spawning the worker.
   - **Measure:** Human-gated stage without `--approve` never spawns LLM worker; stdout includes stage id + resume command.
   - **Evidence:** TTY transcript or spec on stdout.

4. WHEN `--dry-run` is set on `kit next`, THEN the handler SHALL print the resolved verb and focus hint only (no dispatch) — equivalent to today's `spec workflow run --dry-run`.
   - **Measure:** Exit 0; no envelope write; output matches phase probe for same fixture.
   - **Evidence:** Parity test against `workflow_run` dry-run output.

5. WHEN `--loop` is set on `kit next`, THEN the handler SHALL repeat resolve → preflight → dispatch until terminal success, unrecoverable failure, or pause — emitting orchestrator NDJSON events per SKO-3. **(Slice B only.)**
   - **Measure:** Smoke fixture reaches terminal gate in one `--loop` invocation in CI; single-step without `--loop` advances exactly one stage.
   - **Evidence:** SMOKE-01 harness (SKO-7).

6. WHEN terminal success is reached (or resolver finds no remaining step), THEN `kit next` SHALL print run id, last completed stage, and “all stages complete — ready for manual testing” (and PR URL when providers ran). **Slice A:** run id + stage; **PR URL (Slice B).**
   - **Measure:** stdout includes `run_id` and terminal stage id.
   - **Evidence:** Smoke transcript.

---

## REQUIREMENT SKO-2: Profile stage bindings via kit commands

**Slice:** B — Orchestrator loop

**User story:** As a maintainer, I want `default.yaml` stage `command:` values to be real mise tasks so the engine stays tool-agnostic.

### Acceptance criteria

1. WHEN `assets/catalog/workflows/default.yaml` is loaded for a runnable profile, THEN every non-terminal stage SHALL declare a `command:` of the form `mise run spec kit next` **or** `mise run spec kit <verb>` when a stage must pin a specific verb (plus analyze pass flag or env where needed). **Default binding for auto-advance stages: `mise run spec kit next`.**
   - **Measure:** No stub-only `command:` for `specify`, `plan`, `tasks`, `implement`, `review`; `mise run catalog validate` passes.
   - **Evidence:** `conformance.script.spec.ts`; updated `default.yaml`.

2. WHEN terminal `gate` stage evidence runs, THEN evidence commands SHALL remain deterministic shell: `mise run spec gate` and `bash .agents/skills/app-quality-gate/scripts/gate.sh` (unchanged from current profile).
   - **Measure:** Gate stage completes only when both exit 0.
   - **Evidence:** Orchestrator fixture run or smoke fixture.

3. WHEN stage order is validated, THEN profile stage ids SHALL remain a superset matching `detectPhase()` order (009 Layer-B conformance).
   - **Measure:** Existing conformance spec green after binding update.
   - **Evidence:** `bun test --config /dev/null tools/governance/specs/workflow/conformance.script.spec.ts`.

---

## REQUIREMENT SKO-3: Orchestrator loop on `spec workflow run`

**Slice:** B — Orchestrator loop

**User story:** As an operator, I want `mise run spec workflow run [feature]` to advance stages automatically until pause or terminal success — **as an alias for `mise run spec kit next [feature] --loop`**.

### Acceptance criteria

1. WHEN `mise run spec workflow run [feature]` runs without `--dry-run`, THEN it SHALL delegate to **`spec kit next --loop`** (same Orchestrator + NDJSON semantics; no duplicate loop implementation).
   - **Measure:** NDJSON tail shows `stage.entered` / `stage.exited` / `transition.auto` events beyond single `phase_decided`.
   - **Evidence:** `workflow_run.script.spec.ts` integration case with fixture profile.

2. WHEN `--dry-run` is set on `spec workflow run`, THEN behavior SHALL delegate to **`spec kit next --dry-run`** (print next verb + focus hint, no spawn).
   - **Measure:** 011 MSC-8 dogfood behavior preserved.
   - **Evidence:** Existing dry-run specs.

3. WHEN a stage returns `NEED_INPUT` or hits `human_gated: true`, THEN the run SHALL persist snapshot and exit non-zero or blocked status until `mise run spec workflow resume`.
   - **Measure:** Resume with `--approve` or `--answer` continues from snapshot.
   - **Evidence:** `orchestrator.script.spec.ts` + CLI resume specs.

4. WHEN the run reaches terminal `gate` with verified evidence, THEN exit code SHALL be 0 and run state SHALL be terminal success.
   - **Measure:** Smoke fixture run ends at gate with exit 0.
   - **Evidence:** SMOKE-01 harness (SKO-7).

---

## REQUIREMENT SKO-4: Envelope contract per kit verb

**Slice:** A — Kit commands

**User story:** As the orchestrator, I need normalized stage outcomes so transitions follow AWO-2.

### Acceptance criteria

1. WHEN any kit verb completes, THEN it SHALL write (or update) `tmp/workflow-runs/<date>/<run_id>.envelope.<stage>.json` validating against the promoted Envelope schema.
   - **Measure:** `Value.Check(EnvelopeSchema)` passes in co-located tests for DONE and BLOCKED fixtures.
   - **Evidence:** `envelope.schema.spec.ts`; kit handler specs.

2. WHEN a kit verb wraps an LLM step (e.g. `specify`, `implement`), THEN the handler SHALL document the integration seam (Cursor slash / opencode dispatch) in `plan.md` and SHALL NOT parse chat stdout as authority — envelope file is authoritative per AWO-5.
   - **Measure:** Static check: no `speckit.` string literals in `packages/workflow-core`.
   - **Evidence:** ast-grep / existing 009 guards.

3. WHEN evidence markers are required (e.g. `checklists/analyze-plan.md`, `implement-done.md`), THEN kit verbs or evidence commands SHALL create or verify them per 004/009 detector rules.
   - **Measure:** Fixture dir with tasks but no handoff stays on tasks phase; implement-done unlocks gate phase.
   - **Evidence:** `orchestrated_handoff.script.spec.ts`.

---

## REQUIREMENT SKO-5: Review-fix remediation loop

**Slice:** A — `kit review` handler; **Slice B —** automated review-fix R2R in loop (AC2)

**User story:** As an operator, I want failed review to re-dispatch implement with a targeted fix prompt until requirements and gates pass.

### Acceptance criteria

1. WHEN `kit review` runs after implement, THEN it SHALL dispatch the **app-review-handoff** reviewer template (read-only subagent) and produce APPROVE or FIX verdict in the envelope mapped to standard fields.
   - **Measure:** APPROVE maps to `status: "DONE"` with diagnostic code `REVIEW_APPROVE`. FIX maps to `status: "RETRYABLE_FAILURE"` with diagnostic code `REVIEW_FIX_REQUIRED`, listing the fix handoff file path in `artifacts_created` and mirroring it in `evidence[]` as `kind: "artifact"`.
   - **Evidence:** Co-located review dispatch spec with fixture handoff.

2. WHEN review returns FIX and profile retry budget allows, THEN the orchestrator (via external state resolution in `kit next`) SHALL transition back to `implement` (or `review-fix` seam) with fix handoff context — not exit terminal failure immediately.
   - **Measure:** Two-iteration fixture: fail review → pass implement → pass review.
   - **Evidence:** `orchestrator.script.spec.ts` R2R case.

3. WHEN review APPROVEs, THEN evidence SHALL include handoff AC Evidence commands executed (or delegated to `kit gate`).
   - **Measure:** At least one failing Evidence command blocks APPROVE envelope.
   - **Evidence:** Review spec with induced lint failure.

---

## REQUIREMENT SKO-6: PR open and CI watch via kit tail

**Slice:** A — handlers for `pr-open` / `pr-check`; **Slice B —** orchestrator stage transitions + terminal PR URL in `kit next`

**User story:** As an operator, I want PR creation and CI green-check as profile-bound tail steps matching manual flow.

### Acceptance criteria

1. WHEN `kit pr-open` runs, THEN it SHALL invoke the profile `providers.pr_open` binding (`gh pr create …`) under execution_policy allowlist and persist PR ref for the run.
   - **Measure:** Stubbed `gh` in test emits PR URL; `pr_ref` persisted under run dir.
   - **Evidence:** `orchestrator_providers.script.spec.ts` or kit spec.

2. WHEN `kit pr-check` runs, THEN it SHALL invoke `providers.ci_status` with profile retry policy until green or escalation.
   - **Measure:** Failing-then-passing stub completes within max_attempts.
   - **Evidence:** Existing M3 CI gate specs remain green.

3. WHEN CI is green, THEN the orchestrator SHALL notify the operator (stdout summary minimum: run id, PR URL, “ready for manual testing”).
   - **Measure:** Terminal message includes run id and PR link when providers configured.
   - **Evidence:** Smoke transcript or spec assertion on stdout.

---

## REQUIREMENT SKO-7: Orchestrator smoke (SMOKE-01 completion)

**Slice:** B — Orchestrator loop (closeout)

**User story:** As CI, I want a fixture feature dir driven through the kit loop to gate without live `assets/specs/NNN-*`.

### Acceptance criteria

1. WHEN nightly smoke runs, THEN it SHALL execute the orchestrator loop against `tools/__tests__/fixtures/workflow/smoke-feature/` through terminal gate evidence.
   - **Measure:** `.github/workflows/smoke.yml` uses orchestrator path; exit 0 on green `main`.
   - **Evidence:** CI workflow green; documented in [`CI_GUIDE.md`](../../guides/CI_GUIDE.md).

2. WHEN smoke runs locally, THEN `mise run spec test smoke` SHALL include the orchestrator smoke scope (011 facade).
   - **Measure:** Smoke scope spawns fixture path via constant resolver (no hardcoded live spec slug).
   - **Evidence:** `spec_test.script.spec.ts`.

---

## Delivery slices

One feature spec, **two PRs** (009-style). § Workflow flow and kit verb contract is shared; **`plan.md` / `tasks.md` MUST label tasks Slice A or Slice B.** Slice B merges only after Slice A is green on `main`.

### Overview

| Slice | PR branch (suggested)                    | Delivers                                                                                             | Operator outcome                                                                                    |
| ----- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **A** | `feature/012-spec-kit-commands`          | All § Canonical step sequence **kit verbs** + **`kit next`** (single step + `--dry-run`) + envelopes | Run `mise run spec kit next` repeatedly (or each verb explicitly); same manual habit, deterministic |
| **B** | `feature/012-spec-kit-orchestrator-loop` | Profile bindings, **`kit next --loop`**, `spec workflow run` alias, review-fix R2R, SMOKE-01         | One command runs the full loop to gate / PR green                                                   |

**Out of band:** [`013-task-runner-tree-ux`](../013-task-runner-tree-ux/) (TTY spike) — not a dependency for either slice.

### Slice A — Kit commands (PR 1)

**Requirements:** SKO-1, SKO-4, SKO-8 (AC1–4 only), handlers for all rows in § Canonical step sequence (including `gate`, `pr-open`, `pr-check`, `review`).

**Includes:**

- `mise.toml` nested `cmd "kit"` + `tools/bin/spec_kit.script.ts` (or routed module)
- Per-verb handlers matching § Kit verb reference (Goal / Measure / Evidence)
- Extended step resolver (full table: clarify, checklist, human gates — not only condensed `detectPhase()`)
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
# repeat kit next (or explicit kit plan, kit tasks, …) on a fixture feature dir
bun test --config /dev/null tools/bin/spec_kit.script.spec.ts
bash .agents/skills/app-quality-gate/scripts/gate.sh
```

**Slice A done when:** Every row in § Canonical step sequence has a working mise task; `kit next` advances one step correctly on fixture dirs at each phase.

### Slice B — Orchestrator loop (PR 2)

**Prerequisite:** Slice A merged on `main`.

**Requirements:** SKO-2, SKO-3, SKO-5, SKO-6 (provider/orchestrator integration), SKO-7, SKO-8 (AC5–6).

**Includes:**

- `assets/catalog/workflows/default.yaml` — stage `command: mise run spec kit next` (+ evidence unchanged)
- `kit next --loop` and `mise run spec workflow run` as alias
- `@kb/workflow-runtime` Orchestrator wired from `workflow_run.script.ts`
- Review-fix R2R (SKO-5) inside the loop
- `providers.pr_open` / `ci_status` integrated with terminal messaging
- SMOKE-01: fixture feature through loop in `.github/workflows/smoke.yml`
- Resume / snapshot on `NEED_INPUT` and human gates

**Slice B checkpoint (all exit 0):**

```sh
mise run spec kit next tools/__tests__/fixtures/workflow/smoke-feature --loop
mise run spec workflow run tools/__tests__/fixtures/workflow/smoke-feature --dry-run  # parity
mise run spec test smoke
bash .agents/skills/app-quality-gate/scripts/gate.sh
```

**Slice B done when:** Smoke CI green; operator can loop unattended to terminal gate / PR green per Success criteria summary.

### Requirement → slice map

| Requirement                               | Slice A     | Slice B      |
| ----------------------------------------- | ----------- | ------------ |
| SKO-1 Kit subcommand tree                 | ✓           |              |
| SKO-4 Envelope contract                   | ✓           |              |
| SKO-8 `kit next` (AC1–4)                  | ✓           |              |
| SKO-8 `kit next --loop` (AC5–6)           |             | ✓            |
| SKO-2 Profile bindings                    |             | ✓            |
| SKO-3 `workflow run` alias                |             | ✓            |
| SKO-5 Review-fix R2R                      | ✓ (handler) | ✓ (loop AC2) |
| SKO-6 PR/CI (handlers)                    | ✓           |              |
| SKO-6 PR/CI (orchestrator + terminal URL) |             | ✓            |
| SKO-7 SMOKE-01                            |             | ✓            |

### SDD phases per slice

| Artifact     | Slice A                     | Slice B                            |
| ------------ | --------------------------- | ---------------------------------- |
| `spec.md`    | ✓ (this doc)                | shared                             |
| `plan.md`    | Slice A handlers + resolver | + Orchestrator wiring              |
| `tasks.md`   | PR1 checklist               | PR2 checklist (blocked on A merge) |
| `handoff.md` | Optional after A merge      | Required for B closeout            |

---

## Delivery map (spec-only)

| Phase               | Intent                                                                                        |
| ------------------- | --------------------------------------------------------------------------------------------- |
| **Spec (this doc)** | Lock § Workflow flow, kit verbs, **Delivery slices**; defer retro                             |
| **Plan**            | Slice A first, then Slice B (sequential `/speckit-plan` passes or one plan with two sections) |
| **Tasks**           | Slice A tasks → merge → Slice B tasks                                                         |
| **Dogfood**         | Optional real feature (e.g. list-tag-facet-performance) after Slice B smoke green             |

## Assumptions

- **010** and **011** are merged on `main`; packages and mise hub exist.
- Spec Kit slash commands remain the primary LLM integration for v1 kit verbs.
- Human gates (`review-spec`, `handoff-generate`) default to paused unless operator passes `--approve` or uses an auto-approve profile variant (plan-owned).

## Success outcomes summary

**Slice A:** Operator runs **`mise run spec kit next [feature]`** (or explicit **`kit <verb>`**) step-by-step; each verb meets § Kit verb reference; envelopes validate.

**Slice B (full feature):** Operator runs **`kit next --loop`** or **`spec workflow run`**; review-fix and PR/CI tail complete; smoke CI drives the fixture feature to terminal gate — **without** retrospective. Manual app testing remains the operator’s final step after “PR green.”
