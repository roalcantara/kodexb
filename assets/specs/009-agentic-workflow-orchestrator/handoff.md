<!-- markdownlint-disable-file -->

# Handoff — Agentic workflow orchestrator (`009`) — M2 slice

**Spec:** [`spec.md`](./spec.md) (AWO-3, AWO-7) · **Plan:** [`plan.md`](./plan.md) · **Tasks:** [`tasks.md`](./tasks.md) Phase 5
**Architecture:** [`review/002/tool-agnostic-engine-review.md`](./review/002/tool-agnostic-engine-review.md) (4-layer engine)
**Program:** full multi-PR sequence in [`tasks.md`](./tasks.md) · **This handoff:** **M2 only** (PR 3). **Stop** after M2 closeout — do not start M3 until the operator merges the M2 PR.

**Prerequisite:** MVP (PR 1) + **M1** (PR 2) merged on `main` — substrate, `machine.script.ts`, `orchestrator.script.ts`, snapshot/resume CLI.

## Branch (do this first)

```sh
git fetch origin
git checkout main
git pull origin main
git checkout -b feature/009-m2-intervention-memory
```

## Mission

On the merged M1 orchestrator, ship **intervention minimization + memory**:

- **`intervention.script.ts`** (L1 pure) — question dedup against run-shared memory, batched prompts, `decision.defaulted` path (AWO-3.1–3.3)
- **`memory.script.ts`** (L3 I/O) — stage-scoped + run-shared persistence, conflict policy, retention (AWO-7.1–7.4)
- **Wire orchestrator + resume** — load/pass memory at dispatch; complete `--answer` in `tools/governance/specs/workflow_run.script.ts` (M1 left `TODO M2`); emit `decision.*` events via `WorkflowRunWriter`
- **Guide** — memory model + retention in [`WORKFLOW_GUIDE.md`](../../guides/WORKFLOW_GUIDE.md) (M2-GUIDE-01)

## Project overrides (read before coding)

- **Load skills:** `app-context`, `app-testing`, `mise-tasks`
- **Bun runtime**; `bun test`, `bun run`. No Node/Jest/Vitest.
- **TypeBox only** for validation (`Type.*` + `Value.Check`). **No Zod.**
- **No `bun:sqlite`** — memory is JSON files per [`data-model.md`](./data-model.md) + [`OBSERVABILITY_GUIDE.md`](../../guides/OBSERVABILITY_GUIDE.md).
- **Co-located specs** for every new file; **no mocking** — real file I/O with `mkdtemp` scratch dirs and fixture profiles under `tools/__tests__/fixtures/workflow/`.
- **Naming**: `snake_case.script.ts` / `*.schema.ts`; ls-lint + Biome enforce.
- **Logging**: `getLogger(['kb','tools','spec','workflow', …])`; never `console.*`.
- Work lives in `tools/`, **not** `src/`. The renderer MUST NOT import the runtime.

## Non-negotiable architecture (review 002)

1. **Four layers.** L1 intervention logic stays pure (no I/O). `memory.script.ts` is L3 file I/O; orchestrator applies it at dispatch/resume boundaries.
2. **L1 MUST NOT** contain `mise`/`hk`/`bun`/`gh`/`speckit` identifiers in constants, defaults, or type names.
3. **Reuse, don't fork.** Extend `WorkflowRunWriter` + existing `decision.*` union members; persist to paths in [`data-model.md`](./data-model.md).
4. **Memory paths (normative):**
   - Stage: `tmp/workflow-runs/<date>/<run_id>.memory.<stage>.json`
   - Shared: `tmp/workflow-runs/<date>/<run_id>.shared.json`
5. **Conflict policy** from profile `memory.conflict`: `prefer_latest | prompt_user | block`.
6. **Engine tests** use fixture profiles + stub data — never the kb toolchain in L1 specs.

## Implementation tasks (Phase 5 — mark `[X]` in tasks.md when done)

### ENGINE (L1)

- [X] **M2-ENGINE-01** `intervention.script.ts` — dedup unresolved questions against run-shared memory; batch one prompt set per pause; `decision.defaulted` recording helper. Co-located `intervention.script.spec.ts`. Wire into `machine.script.ts` / `orchestrator.script.ts` at `need_input` boundaries. (AWO-3.1–3.3)

### PROFILE / memory (L3)

- [X] **M2-PROFILE-01** `memory.script.ts` — read/write stage + shared JSON; apply `memory.conflict`; honor `memory.retention` knobs. Co-located `memory.script.spec.ts` per conflict mode + retention. Integrate with orchestrator bootstrap and `workflow_run.script.ts` resume. (AWO-7.1–7.4)

### GUIDE

- [X] **M2-GUIDE-01** [P] Add **Memory model + retention** section to [`WORKFLOW_GUIDE.md`](../../guides/WORKFLOW_GUIDE.md) (paths, conflict enum, retention split vs OBSERVABILITY). Optionally document `mise run spec workflow resume --answer` / `--approve` if still missing from M1. (AWO-7)

### Resume completion (M1 debt — required in M2)

- [X] **M2-RESUME-01** Replace `TODO M2` in `tools/governance/specs/workflow_run.script.ts` — implement `--answer <qid>=<value>`: hydrate snapshot, write shared memory, emit `decision.answered`, auto-exit `need_input`. Default/ambiguous `run_id` resolution per AWO-3 AC4. Co-located `workflow_run.script.spec.ts`. (AWO-3.4)

### Closeout

- [X] **M2-CLOSEOUT-01** all Verify commands green; Phase 5 tasks `[X]` in [`tasks.md`](./tasks.md)

## Maintainer AC checklist (M2 slice)

Each row is verified by the named Evidence; check only when the test is green.

| ID        | Done when                                                               | Evidence                                                                                  |
| --------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| AWO-3 AC1 | inferred inputs auto-fill from shared memory / context (fixture replay) | `bun test --config /dev/null tools/governance/specs/workflow/intervention.script.spec.ts` |
| AWO-3 AC2 | duplicate questions removed; one batched prompt per pause               | `bun test --config /dev/null tools/governance/specs/workflow/intervention.script.spec.ts` |
| AWO-3 AC3 | defaults recorded in shared memory + `decision.defaulted` event         | `bun test --config /dev/null tools/governance/specs/workflow/memory.script.spec.ts`       |
| AWO-3 AC4 | `--answer` hydrates, persists, auto-resumes; default/ambiguous `run_id` | `bun test --config /dev/null tools/governance/specs/workflow_run.script.spec.ts`          |
| AWO-7 AC1 | stage memory loaded/created before dispatch                             | `bun test --config /dev/null tools/governance/specs/workflow/memory.script.spec.ts`       |
| AWO-7 AC2 | decisions in `<run_id>.shared.json` + `decision.*` NDJSON               | `bun test --config /dev/null tools/governance/specs/workflow/memory.script.spec.ts`       |
| AWO-7 AC3 | each `memory.conflict` enum handled deterministically                   | `bun test --config /dev/null tools/governance/specs/workflow/memory.script.spec.ts`       |
| AWO-7 AC4 | retention honors tmp/durable knobs                                      | `bun test --config /dev/null tools/governance/specs/workflow/memory.script.spec.ts`       |

> AWO-3 AC1 baseline threshold lives in `tools/metrics/baselines/workflow.json` (POLISH-02). M2 may seed a minimal fixture corpus; do not block M2 on full NFR harness.

## Pitfalls (prior slices — don't reintroduce)

- **Toolchain leak into L1** — intervention logic stays string-literal-free for kb tools.
- **Inlining memory I/O in `machine.script.ts`** — keep file I/O in `memory.script.ts`; machine receives plain values.
- **Second writer** — extend `WorkflowRunWriter` only.
- **Skipping `--answer`** — M1 stub must be completed in M2-RESUME-01 (AWO-3 AC4).
- **Implementing M3/M4 on this branch** — out of scope.

## Verify (claim done only when all exit 0)

```sh
bun test --config /dev/null tools/governance/specs/workflow/
bun test --config /dev/null tools/governance/specs/workflow_run.script.spec.ts
bun test --config /dev/null tools/bin/spec.script.spec.ts
bun run lint:ast-grep
mise run spec lint assets/specs/009-agentic-workflow-orchestrator
mise run spec gate assets/specs/009-agentic-workflow-orchestrator
```

Operator before merge: `/app-review-handoff` on this file.

## Out of scope (this handoff)

- M3 (AWO-6 PR/CI), M4 (AWO-8/11 retrospective/sandbox)
- `PROFILE-SDD-*`, `SMOKE-*`, full `workflow.json` NFR harness (POLISH-02)
- `packages/workflow-*`, `src/` changes, `hk.pkl` / `mise.toml` beyond doc refs
- Committing or opening a PR — only when the operator asks

## Suggested commit (operator, after review)

```sh
git add tools/governance/specs/workflow/ tools/governance/specs/workflow_run.script.ts tools/governance/specs/workflow_run.script.spec.ts assets/guides/WORKFLOW_GUIDE.md assets/specs/009-agentic-workflow-orchestrator/

git commit -m "$(cat <<'EOF'
feat(workflow): Add intervention and memory

Introduce intervention dedup, memory.script persistence, decision
events, and complete spec workflow resume --answer (AWO-3, 7).

EOF
)"
```

## Post-commit (operator)

```sh
git push -u origin HEAD

gh pr create \
  --title "feat(workflow): 009 M2 intervention and memory" \
  --body "$(cat <<'EOF'
## Summary
- Add `intervention.script.ts` for question dedup and decision defaults
- Add `memory.script.ts` for stage/shared JSON persistence and conflict policy
- Complete `spec workflow resume --answer` and wire `decision.*` telemetry

## Test plan
- [x] `bun test --config /dev/null tools/governance/specs/workflow/`
- [x] `bun test --config /dev/null tools/governance/specs/workflow_run.script.spec.ts`
- [x] `mise run spec gate assets/specs/009-agentic-workflow-orchestrator`
- [x] `/app-review-handoff` on handoff.md

EOF
)"
```

## Roadmap (not in scope — promote to handoff.md after M2 merges)

| Slice      | Phase | Requirements                                        | PR  |
| ---------- | ----- | --------------------------------------------------- | --- |
| **M3**     | 6     | AWO-6 — PR/CI completion (Post-MVP)                 | 4   |
| **M4**     | 7     | AWO-8, AWO-11 — retrospective + sandbox enforcement | 5+  |
| **Polish** | 8     | AWO-12.3 guide crossref; NFR baselines + harness    | —   |
