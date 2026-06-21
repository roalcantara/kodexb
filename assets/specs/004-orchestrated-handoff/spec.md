<!-- markdownlint-disable-file -->

# Orchestrated handoff SDD workflow

**Feature Branch**: `feat/004-orchestrated-handoff`
**Release**: v0.13.x (target)
**Status**: In review

**Input**: Implement a Spec Kit workflow that runs the full SDD cycle and, after the tasks-pass `analyze` checkpoint and before `implement`, emits a provider-ready handoff prompt so Gherkin/BDD work can be delegated to a separate worker. **v1 opencode dispatch only**; multi-provider dispatch is documented but deferred to v2.

## Introduction

kb already uses Spec Kit's vanilla `speckit` workflow (`specify → plan → tasks → implement`).
What is missing is a workflow that bakes in the kb-specific phases the constitution
already names — `clarify`, `checklist`, `analyze` — **and** a deterministic seam,
**after the tasks-pass `analyze` checkpoint and before `implement`**, that produces
an actionable provider-ready handoff prompt when the next slice of work belongs in
`assets/features/**/*.feature` (Gherkin / BDD) rather than in `src/**/*.spec.ts`.

Today this seam exists only as ad-hoc files under `tmp/handoffs/` written by hand
(e.g. the prior naming convention used a worker prefix per provider). The result
is real but unrepeatable: each new spec re-invents the prompt shape, the AC-tag
mapping, the verify commands, and the pitfalls section. v1 standardises emission
under `tmp/handoffs/opencode-{slug}-{focus}.md`.

**Goal:** Ship a registered Spec Kit workflow named `orchestrated-handoff` plus a
deterministic Bun-based handoff generator that:

1. Runs the canonical kb SDD phase order with **dual `analyze` passes** (both advisory, same `speckit.analyze` command):

   ```
   specify → clarify → checklist → plan
     → analyze (plan pass)     ← advisory; catches plan/traceability gaps
     → tasks                   → tasks.md + handoff.md
     → analyze (tasks pass)    ← advisory; catches task/handoff/Evidence drift
     → handoff-generate        ← Bun script (NOT in workflow YAML)
     → implement
     → review                  ← mise run spec gate
   ```

   Completion markers: `checklists/analyze-plan.md` and `checklists/analyze-tasks.md`.
   The workflow YAML includes **both** `analyze` steps (so Spec Kit can run it
   end-to-end); the orchestrator additionally reads the checklist markers when
   the operator mixes `mise` and manual `speckit.*` invocations.

2. **After analyze-tasks, before implement**, emits `tmp/handoffs/opencode-{slug}-{focus}.md` from the feature's `handoff.md` AC table with full AC-tag fidelity (`@ac:SF-n_ACm` ↔ slice id `sf{n}ac{m}`).
3. Optionally dispatches the emitted prompt to `opencode run` when `--dispatch` is passed (v1: opencode only).
4. Lets the orchestrator (separate Bun script) print a deterministic, rule-based **subtask manifest** classifying remaining work into `implement-src`, `gherkin-bdd-handoff`, or `catalog-touch` workers.

**User value:** Spec authors get a one-command path from a brownfield handoff
table to a ready-to-paste worker prompt that respects the catalog tag policy,
the `@unit`/`@e2e` runner split, and the pitfalls already solved in this repo.
No more hand-rolled prompts; no more @unit/Playwright misrouting.

## Clarifications

### Session 2026-06-06

- Q: Where does the spec land? → A: `assets/specs/004-orchestrated-handoff/` (Spec Kit shape per `DOC_AUTHORITY.md`). The `docs/superpowers/` default is gitignored in this repo.
- Q: Should the workflow YAML embed `type: script` steps for handoff emission? → A: **No** — workflow YAML registers canonical `speckit.*` phases + human gates only. Handoff emission and orchestration are invoked outside YAML via `mise run spec workflow …` and `mise run spec handoff-generate …`. The seam is documented in `WORKFLOW_SDD_GUIDE.md`.
- Q: Worker dispatch semantics? → A: v1 emits prompt files always; `--dispatch` flag (or `ORCHESTRATED_HANDOFF_DISPATCH=1` env) additionally pipes the prompt to `opencode run`. v2 multi-provider dispatch (codex / claude / deepseek) is out of scope.
- Q: Pilot acceptance — does the emitted handoff need @e2e? → A: **Yes** — when the source `handoff.md` AC table contains an operator-smoke / browser-scenario row (e.g. SF-3 AC3), the emitted prompt MUST include at least one `@e2e` Playwright instruction alongside `@unit` Cucumber rows. The "no Playwright for @unit" pitfall still holds.
- Q: How is the `opencode` integration grounded? → A: Per [opencode CLI docs](https://opencode.ai/docs/cli/), the non-interactive entry is `opencode run [message..]`. Dispatch shells out via Bun argv for small prompts and switches to stdin or a temp file when the body exceeds an argv-safe threshold; `Bun.which('opencode')` is the liveness probe.
- Q: Analyze once or twice? → A: **Twice**, both advisory, same `speckit.analyze` command.
  - **Plan pass:** after `plan.md`, before `speckit.tasks` — catches plan/traceability gaps (004 pilot).
  - **Tasks pass:** after `tasks.md` + `handoff.md`, before `handoff-generate` — catches task/AC/Evidence drift.
  - Completion markers: `checklists/analyze-plan.md` and `checklists/analyze-tasks.md`.
  - The workflow YAML includes both analyze steps so `specify workflow run` can drive the cycle end-to-end. The orchestrator also reads checklist markers when the operator mixes `mise` and manual `speckit.*` invocations.
- Q: How is "implement complete" detected? → A: The orchestrator looks for `checklists/implement-done.md` (symmetric with `analyze-plan.md` / `analyze-tasks.md`). Operators create it after `speckit.implement` finishes and quality checks pass.

## Out of scope

- `orchestrated-sliced` and `orchestrated-hotfix` workflows (deferred — separate PRs).
- Replacing `.cursor/skills/speckit-*` or any Spec Kit skill.
- Multi-provider dispatch (codex / claude / deepseek) is **v2 only**; v1 accepts `--worker opencode` only and rejects other workers with exit 2.
- LLM-orchestrated subtask planning. v1 is rule-based; the env flag `ORCHESTRATED_HANDOFF_LLM_ORCHESTRATOR=1` is a documented seam only.
- Auto-commit after `implement`. `auto_commit.*` stays `false` in `.specify/extensions/git/git-config.yml`.
- Implementing Gherkin scenarios themselves. The workflow generates the handoff prompt that briefs the next agent.

## Glossary

| Term                      | Meaning                                                                                                                                  |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Workflow**              | A `.specify/workflows/<id>/workflow.yml` file registered in `.specify/workflow-catalogs.yml` and runnable via `specify workflow run`.    |
| **Phase**                 | One step in the SDD pipeline (`specify`, `clarify`, `plan`, …).                                                                          |
| **Handoff prompt**        | A markdown file under `tmp/handoffs/` containing a copy-paste agent prompt, AC table, file touch list, verify commands, and pitfalls.    |
| **AC slice id**           | Short id used by `mise run test tag <key> <slice>`, derived from an AC tag (`@ac:SF-1_AC2` → `sf1ac2`) via `sliceIdFromAcTag`.           |
| **Subtask manifest**      | XML/JSON list of worker assignments (`implement-src`, `gherkin-bdd-handoff`, `catalog-touch`) printed by the orchestrator.                |
| **Operator-smoke AC**     | An AC whose Evidence column points to a manual UI step or browser scenario, not to a `bun test` / `mise run test tag` command.            |
| **Catalog touch**         | A plan that adds or modifies a key in `assets/catalog/catalog.yaml`.                                                                      |
| **Worker provider**       | v1 = `opencode` only; v2 may add `codex` / `claude` / `deepseek` (filename prefix `{worker}-` deferred to v2). v1 CLI rejects non-opencode workers with exit 2. |

---

## REQUIREMENT OHW-1: Workflow registered and runnable

**User story:** As a spec author, I want a registered Spec Kit workflow that runs
the canonical kb SDD phases with human review gates, so I can drive a full
feature from `specify` to `review` without hand-rolling the step sequence.

### Acceptance criteria

1. WHEN a contributor runs `specify workflow list`, THEN `orchestrated-handoff` SHALL appear with the metadata fields `id`, `name`, `version`, and `description` populated.
   - **Measure:** `specify workflow list` (or catalog parse equivalent) shows the workflow id.
   - **Evidence:** `mise run spec workflow orchestrated-handoff --next` (smoke) and `bun test tools/governance/specs/workflow/` (catalog parse spec).

2. WHEN `.specify/workflows/orchestrated-handoff/workflow.yml` is loaded, THEN every `steps[].command` SHALL reference a known `speckit.*` command (`specify`, `clarify`, `checklist`, `plan`, `analyze`, `tasks`, `implement`) and every `steps[].type` other than `command` SHALL be `gate` with `options: [approve, reject]`.
   - **Measure:** YAML lint + structural assertion in `orchestrated_handoff.script.spec.ts`.
   - **Evidence:** `bun test tools/governance/specs/workflow/orchestrated_handoff.script.spec.ts`.

3. WHEN the workflow is registered in `.specify/workflow-catalogs.yml`, THEN the catalog SHALL list both `speckit/workflow.yml` and `orchestrated-handoff/workflow.yml` under `catalogs[0].workflows[]`.
   - **Measure:** YAML round-trip parse in test asserts both paths present.
   - **Evidence:** `bun test tools/governance/specs/workflow/`.

---

## REQUIREMENT OHW-2: Handoff generator emits a canonical prompt

**User story:** As a spec author handing Gherkin work to a worker, I want one
command that turns the feature's `handoff.md` AC table into a copy-paste prompt
with verify commands, file touch list, and pitfalls, so the worker can start
without me re-explaining repo conventions.

### Acceptance criteria

1. WHEN `mise run spec handoff-generate --feature <dir> --focus gherkin` runs against a feature dir containing `handoff.md`, THEN the script SHALL write `tmp/handoffs/opencode-{slug}-{focus}.md` and print its absolute path on stdout.
   - **Measure:** Run against `assets/specs/003-sync-frecency-preserve/`; assert file exists and contains the slug.
   - **Evidence:** `bun test tools/governance/specs/workflow/handoff_generate.script.spec.ts`.

2. WHEN the generator parses a well-formed `handoff.md` AC table (`ID | Done when | Evidence`), THEN every row whose ID matches `SF-n ACm` SHALL appear in the emitted prompt with the AC tag (`@ac:SF-n_ACm`) AND the slice id (`sf{n}ac{m}`) computed via `sliceIdFromAcTag`.
   - **Measure:** Table-driven test over `parseHandoffAcTable` and `renderHandoffPrompt`.
   - **Evidence:** `bun test tools/governance/specs/workflow/handoff_generate.script.spec.ts`.

3. WHEN the AC table contains an operator-smoke row (Evidence column does not match `mise run test tag …` or `bun test …`), THEN the emitted prompt SHALL include at least one `@e2e` Playwright instruction with a target path under `bdd/e2e/` AND SHALL NOT instruct Playwright for any `@unit` row.
   - **Measure:** Pilot run on 003 (SF-3 AC3 is operator-smoke). Assert `@e2e` block present, `@unit` block does not mention Playwright.
   - **Evidence:** `bun test tools/governance/specs/workflow/handoff_generate.script.spec.ts` (e2e-invariant fixture).

4. WHEN the generator runs against 003-sync-frecency-preserve, THEN the emitted prompt SHALL reference `assets/features/sync.feature`, `bdd/unit/`, and `mise run test tag sync_frecency_preserve`.
   - **Measure:** Pilot integration test using the real handoff.md.
   - **Evidence:** `bun test tools/governance/specs/workflow/handoff_generate.script.spec.ts` (pilot fixture spec).

5. WHEN `--focus` is not in `{gherkin, catalog, e2e-fix}` OR `--worker` is present and not `opencode`, THEN the script SHALL exit `2` with a usage error on stderr.
   - **Measure:** CLI-level test invoking the script with bad flags (`--worker claude`, `--worker codex`, `--worker deepseek` all reject with exit 2).
   - **Evidence:** `bun test tools/governance/specs/workflow/handoff_generate.script.spec.ts`.

---

## REQUIREMENT OHW-3: Orchestrator detects phase and emits subtask manifest

**User story:** As a spec author resuming work mid-cycle, I want a script that
inspects the feature dir, prints the next command, and (when asked) emits a
deterministic subtask manifest, so I don't need to remember which phase I'm in.

### Acceptance criteria

1. WHEN `mise run spec workflow orchestrated-handoff --feature <dir> --next` runs, THEN the script SHALL print exactly one canonical next command to stdout, derived from file presence and the 10-row transition table documented in `WORKFLOW_SDD_GUIDE.md` § orchestrated-handoff (transitions detailed below this AC).
   - **Measure:** Table-driven test over the 10 transitions.
   - **Evidence:** `bun test tools/governance/specs/workflow/orchestrated_handoff.script.spec.ts`.

   The normative transition table referenced above:

   | Condition                                                       | Next command printed                                               |
   | --------------------------------------------------------------- | ------------------------------------------------------------------ |
   | No spec.md                                                      | `speckit.specify` (or document `mise run spec feature-init` first) |
   | spec.md, no plan.md                                             | `speckit.plan`                                                     |
   | plan.md, no `checklists/analyze-plan.md`                        | `speckit.analyze` (plan pass; print focus hint)                    |
   | analyze-plan done, no tasks.md                                  | `speckit.tasks`                                                    |
   | tasks.md without `handoff.md`                                   | `speckit.tasks` (complete handoff.md before tasks-pass analyze)    |
   | tasks.md + handoff.md, no `checklists/analyze-tasks.md`         | `speckit.analyze` (tasks pass; print focus hint)                   |
   | analyze-tasks done, manifest needs `gherkin-bdd-handoff`        | `mise run spec handoff-generate … --focus gherkin`                 |
   | analyze-tasks done, manifest does NOT need `gherkin-bdd-handoff` | `speckit.implement`                                                |
   | handoff file exists under `tmp/handoffs/`, implement not started | `speckit.implement`                                                |
   | `checklists/implement-done.md` present                          | `mise run spec gate assets/specs/NNN-slug`                         |

2. WHEN `plan.md` exists and `checklists/analyze-plan.md` does not, THEN `--next` SHALL print `speckit.analyze` with a one-line plan-pass focus hint ("Focus: plan.md traceability").
   - **Measure:** Transition test for plan-pass analyze.
   - **Evidence:** `bun test tools/governance/specs/workflow/orchestrated_handoff.script.spec.ts`.

3. WHEN `tasks.md` and `handoff.md` exist and `checklists/analyze-tasks.md` does not, THEN `--next` SHALL print `speckit.analyze` with a one-line tasks-pass focus hint ("Focus: tasks.md + handoff.md Evidence").
   - **Measure:** Transition test for tasks-pass analyze.
   - **Evidence:** `bun test tools/governance/specs/workflow/orchestrated_handoff.script.spec.ts`.

4. WHEN `checklists/analyze-tasks.md` exists and the manifest requires `gherkin-bdd-handoff`, THEN `--next` SHALL print `mise run spec handoff-generate --feature <dir> --focus gherkin`.
   - **Measure:** Transition test that gates handoff-generate on analyze-tasks completion.
   - **Evidence:** `bun test tools/governance/specs/workflow/orchestrated_handoff.script.spec.ts`.

5. WHEN `checklists/implement-done.md` exists for the feature, THEN `--next` SHALL print `mise run spec gate assets/specs/NNN-slug`. This checklist marker is operator-written after `speckit.implement` finishes and unit checks pass — symmetric with `analyze-plan.md` / `analyze-tasks.md`.
   - **Measure:** Final-transition test using the checklist marker.
   - **Evidence:** `bun test tools/governance/specs/workflow/orchestrated_handoff.script.spec.ts`.

6. WHEN `--manifest` is passed and the feature dir contains `handoff.md` + `plan.md`, THEN the script SHALL print a well-formed XML subtask list containing `implement-src` always, plus `gherkin-bdd-handoff` and `catalog-touch` per the rules listed below this AC. The same manifest function gates the `--next` transition between `analyze-tasks` and `handoff-generate` (see AC4): if the manifest does NOT include `gherkin-bdd-handoff`, `--next` SHALL skip directly to `speckit.implement`.
   - **Measure:** Rule-table test mapping handoff + plan fixtures (including the 003 pilot) to expected manifest entries. 003 MUST produce a `gherkin-bdd-handoff` subtask. A unit-only fixture (all Evidence cells match `bun test` and plan does not mention `assets/features/`) MUST NOT produce `gherkin-bdd-handoff`, and `--next` MUST print `speckit.implement` for that fixture.
   - **Evidence:** `bun test tools/governance/specs/workflow/orchestrated_handoff.script.spec.ts`.

   Manifest rules:
   - `implement-src` SHALL always be present.
   - `gherkin-bdd-handoff` SHALL be present iff ANY of:
     - an operator-smoke row exists in `handoff.md` (Evidence does NOT match `mise run test tag` or `bun test`), OR
     - `plan.md` contains the literal string `assets/features/`, OR
     - `plan.md` declares Gherkin traceability not fully reflected in `handoff.md` Evidence (a feature/scenario named in plan with no matching slice id appearing in any Evidence cell).
   - `catalog-touch` SHALL be present iff `plan.md` contains the literal string `assets/catalog/catalog.yaml`.

7. WHEN the manifest contains a `gherkin-bdd-handoff` subtask, THEN the description SHALL name `tmp/handoffs/opencode-{slug}-gherkin.md` and instruct the worker to consume that file.
   - **Measure:** Manifest content assertion.
   - **Evidence:** `bun test tools/governance/specs/workflow/orchestrated_handoff.script.spec.ts`.

---

## REQUIREMENT OHW-4: Opencode dispatch is opt-in and degrades gracefully

**User story:** As a spec author with opencode installed, I want a single flag
that pipes the emitted prompt into `opencode run` so I don't need to copy-paste
manually. As a spec author without opencode, I want the script to still write
the file and tell me why dispatch was skipped.

### Acceptance criteria

1. WHEN `--dispatch` is passed AND `Bun.which('opencode')` returns a path, THEN the script SHALL invoke `opencode run` with the prompt body after writing the prompt file. For small bodies (under an argv-safe threshold; default ~64 KiB) it MAY pass the body as a positional argument; for larger bodies it SHALL pass the body via stdin or a temp file. The script SHALL propagate `opencode`'s exit code as its own.
   - **Measure:** Test that injects a fake `opencode` shim and asserts the spawn call shape on both branches (argv vs stdin/temp-file); integration smoke is operator-run.
   - **Evidence:** `bun test tools/governance/specs/workflow/handoff_generate.script.spec.ts` (dispatch fixture).

2. WHEN `--dispatch` is passed AND `opencode` is not on `$PATH`, THEN the script SHALL write the prompt file AND emit a one-line warning to stderr identifying the file path, AND SHALL exit `0`.
   - **Measure:** Test that stubs `Bun.which` to return null and asserts stderr + exit code.
   - **Evidence:** `bun test tools/governance/specs/workflow/handoff_generate.script.spec.ts`.

3. WHEN `ORCHESTRATED_HANDOFF_DISPATCH=1` is set in the environment AND `--dispatch` is NOT passed, THEN the script SHALL behave as if `--dispatch` were passed.
   - **Measure:** Environment-driven test asserting the two paths converge.
   - **Evidence:** `bun test tools/governance/specs/workflow/handoff_generate.script.spec.ts`.

---

## REQUIREMENT OHW-5: SDD guide documents the workflow end-to-end

**User story:** As a contributor coming to this workflow cold, I want
`WORKFLOW_SDD_GUIDE.md` to tell me when to choose `orchestrated-handoff` over
`speckit`, what commands to run, and how to resume an interrupted run, so I
don't need to read the source.

### Acceptance criteria

1. WHEN the PR lands, THEN `WORKFLOW_SDD_GUIDE.md` SHALL no longer mark `orchestrated-handoff` as "Deferred to a follow-up PR" AND SHALL contain a top-level section that lists the canonical entry commands (`mise run spec workflow orchestrated-handoff --feature …`, `mise run spec handoff-generate --feature …`, `mise run spec resume`).
   - **Measure:** Grep the rendered guide for the new section and the absence of the deferred line.
   - **Evidence:** `bun test tools/governance/specs/workflow/` (guide-content fixture spec) and manual diff review.

2. WHEN a contributor reads the new section, THEN it SHALL describe when to choose **opencode worker handoff vs primary implement (Cursor / opencode / `speckit.implement`)**, link to `tmp/handoffs/` and the `--focus` taxonomy, and state that v1 dispatches only to opencode (v2 multi-provider deferred).
   - **Measure:** Section presence + required substrings (`opencode worker handoff`, `tmp/handoffs/`, `--focus`, `v1 opencode-only`).
   - **Evidence:** `bun test tools/governance/specs/workflow/`.

3. WHEN `orchestrated-handoff` introduces dual-analyze (the constitution currently lists a single Analyze row), THEN this PR SHALL add a constitution footnote on the Analyze row recording the dual-pass behavior AND SHALL document the full phase order (including both analyze passes) in `WORKFLOW_SDD_GUIDE.md` § orchestrated-handoff. Precedence still stands: `assets/guides/ > CLAUDE.md > constitution > templates`.
   - **Measure:** Diff confirms (a) one footnote on `.specify/memory/constitution.md` § SDD Pipeline Analyze row and (b) new phase-order block in guide. No principle bodies edited.
   - **Evidence:** PR diff review + grep for footnote marker.

---

## REQUIREMENT OHW-6: EARS lint is a deterministic gate in the workflow path

**User story:** As a spec author, I want the orchestrated-handoff path to make
EARS-shaped `spec.md` a **deterministic** precondition for planning, so LLM
advisory skills (`speckit-checklist`, `speckit-analyze`) are not the only
guardrail (per `PLAN_PUNCHLIST.md` §1 and §5).

### Acceptance criteria

1. WHEN the orchestrator is invoked with `--lint` (`mise run spec workflow orchestrated-handoff --feature <dir> --lint`), THEN it SHALL delegate to `tools/governance/specs/lint.script.ts --strict` against `<dir>` and propagate its exit code. The orchestrator SHALL NOT duplicate EARS parsing.
   - **Measure:** Spawn-shape test asserts the orchestrator invokes `lint.script.ts` with the feature dir and `--strict` flags; exit code propagates.
   - **Evidence:** `bun test tools/governance/specs/workflow/orchestrated_handoff.script.spec.ts`.

2. WHEN the `WORKFLOW_SDD_GUIDE.md` § orchestrated-handoff documents the review-spec gate, THEN it SHALL state: "Before approving plan, run `mise run spec lint <featureDir> --strict` — deterministic EARS gate; checklist and analyze are advisory only."
   - **Measure:** Guide-content grep for the literal substring `deterministic EARS gate`.
   - **Evidence:** `bun test tools/governance/specs/workflow/sdd_guide_content.script.spec.ts`.

3. WHEN this PR lands, THEN `tools/governance/specs/lint.script.ts` SHALL NOT be weakened to make 004 pass — any new errors introduced by 004 must be fixed in the spec, not silenced in the linter.
   - **Measure:** Diff review confirms `lint.script.ts` rules unchanged or strengthened only.
   - **Evidence:** PR diff review.

---

## REQUIREMENT OHW-7: Plan phase uses selective skill routing

**User story:** As a plan author, I want the planner to load **only the skills
likely needed** for this feature (typically ≤ 4), so context stays focused and
plans stay slim. "Load all skills" is an anti-pattern.

### Acceptance criteria

1. WHEN this PR lands, THEN `assets/guides/WORKFLOW_SDD_GUIDE.md` SHALL contain a section "Plan skill routing" (or link to a dedicated `SDD_PLAN_SKILL_ROUTING.md`) with a routing table mapping plan touch-areas to specific skills, AND SHALL state the cap rule "Maximum 4 skills unless operator explicitly expands scope".
   - **Measure:** Guide-content grep for the table heading and the cap rule.
   - **Evidence:** `bun test tools/governance/specs/workflow/sdd_guide_content.script.spec.ts`.

2. WHEN a contributor reads `.cursor/skills/speckit-plan/SKILL.md`, THEN the file SHALL begin with a kb-fork section pointing at the routing table and instructing the planner to load at most 4 skills before Phase 0 research. If the upstream Spec Kit skill is not present in this repo (kb has not forked it yet), this AC is satisfied by adding a documentation note in `WORKFLOW_SDD_GUIDE.md` § Plan skill routing that names the upstream skill and the routing rule, and by referencing the routing doc from the handoff-generate prompt template (per AC3).
   - **Measure:** Either grep `.cursor/skills/speckit-plan/SKILL.md` for the routing pointer, or grep the guide for the upstream-skill compatibility note.
   - **Evidence:** Diff review + `bun test tools/governance/specs/workflow/sdd_guide_content.script.spec.ts`.

3. WHEN the handoff-generate prompt is rendered, THEN under "Required reading" it SHALL include a pointer to the plan skill routing guide section, so worker prompts and primary implementers see the same rule.
   - **Measure:** Generator output contains the literal substring `SDD_PLAN_SKILL_ROUTING` or `Plan skill routing` and the cap phrase `at most 4 skills`.
   - **Evidence:** `bun test tools/governance/specs/workflow/handoff_generate.script.spec.ts`.

---

## REQUIREMENT OHW-8: Slim ancillary artifacts (normative quartet only)

**User story:** As a spec reader, I want plan/tasks/checklist outputs to stay
minimal and non-repetitive — normative truth lives in `spec.md`, `plan.md`,
`tasks.md`, and `handoff.md` only. Optional Spec Kit satellites
(`research.md`, `data-model.md`, `contracts/`, `quickstart.md`) appear **only
when plan complexity demands**.

### Acceptance criteria

1. WHEN this PR lands, THEN `WORKFLOW_SDD_GUIDE.md` SHALL document the rule: "**Normative quartet:** `spec.md`, `plan.md`, `tasks.md`, `handoff.md`. Optional satellites (`research.md`, `data-model.md`, `contracts/`, `quickstart.md`) are feature-scoped and SHOULD be created only when `plan.md` Technical Context has unresolved NEEDS CLARIFICATION or cross-module contracts. `plan.md` and `tasks.md` SHALL NOT copy EARS AC text — reference requirement IDs (OHW-n, SF-n) instead. Checklist and analyze outputs are advisory snapshots, not second specs."
   - **Measure:** Guide-content grep for `Normative quartet` and the no-copy rule.
   - **Evidence:** `bun test tools/governance/specs/workflow/sdd_guide_content.script.spec.ts`.

2. WHEN `.specify/templates/plan-template.md` is read, THEN the Project Structure section SHALL mark `research.md`, `data-model.md`, `contracts/`, and `quickstart.md` as **OPTIONAL** with the trigger condition documented inline.
   - **Measure:** Grep the template for the word `OPTIONAL` next to each satellite.
   - **Evidence:** `bun test tools/governance/specs/workflow/sdd_guide_content.script.spec.ts` (or a direct template-content assertion).

3. WHEN 004 is dogfooded, THEN `assets/specs/004-orchestrated-handoff/` SHALL contain `plan.md`, `tasks.md`, and `handoff.md` — slim, pointer-only (references OHW-n IDs instead of duplicating EARS text) — and SHALL NOT contain `research.md`, `data-model.md`, `contracts/`, or `quickstart.md`.
   - **Measure:** Directory listing assertion + grep that `plan.md` references OHW IDs and does not contain "SHALL".
   - **Evidence:** Directory listing + `mise run spec lint assets/specs/004-orchestrated-handoff --strict` and `mise run spec trace assets/specs/004-orchestrated-handoff --strict` both succeed.

4. WHEN the handoff prompt is rendered, THEN the Per-AC slice commands section SHALL NOT repeat the full Evidence string from the AC table; it SHALL print `<AC id> → <slice id> (mise run test tag <catalog_key> <slice>)` only.
   - **Measure:** Generator-output test asserts the slice section does not contain repeated Evidence strings.
   - **Evidence:** `bun test tools/governance/specs/workflow/handoff_generate.script.spec.ts`.

---

## E2e declaration

| Requirement | E2e tag                            | Scenario (name only)                                                       |
| ----------- | ---------------------------------- | -------------------------------------------------------------------------- |
| OHW-2 AC3   | `@orchestrated_handoff` (pending)  | Pilot 003 generates an `@e2e` Playwright block alongside `@unit` rows      |
| OHW-4 AC2   | `@orchestrated_handoff` (pending)  | `--dispatch` without opencode writes file and warns; exits zero            |

E2e Gherkin is **stretch** for this feature — the deterministic gates (unit tests, lint, gate.sh) are the release evidence. If e2e scenarios are added later, they live under `assets/features/governance.feature` (new) with a single catalog key `orchestrated_handoff`.

## Performance / non-functional notes

- Generator must complete in under 250ms on a typical handoff (per-spec runtime budget for `mise run` UX).
- Generator must work offline; the only network-touching path is the optional `opencode run` dispatch, which is opt-in.
- No new runtime dependencies. Bun built-ins only (`Bun.file`, `Bun.which`, `Bun.spawnSync`, `Bun.Glob`).
