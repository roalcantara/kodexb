<!-- markdownlint-disable-file -->

# Handoff — Agentic workflow orchestrator (`009`) — M1 slice

**Spec:** [`spec.md`](./spec.md) (AWO-1, AWO-5, AWO-13; AWO-4.2; AWO-2 AC3–4 via machine) · **Plan:** [`plan.md`](./plan.md) · **Tasks:** [`tasks.md`](./tasks.md) Phase 4
**Architecture:** [`review/002/tool-agnostic-engine-review.md`](./review/002/tool-agnostic-engine-review.md) (4-layer engine)
**Program:** full multi-PR sequence in [`tasks.md`](./tasks.md) · **This handoff:** **M1 only** (PR 2). **Stop** after M1 closeout — do not start M2 until the operator merges the M1 PR.

**Prerequisite:** MVP slice (PR 1) merged on `main` — schemas, Executor adapter, profile loader, persistence, Layer-B conformance.

## Branch (do this first)

```sh
git fetch origin
git checkout main
git pull origin main
git checkout -b feature/009-m1-orchestration
```

## Mission

On the merged MVP substrate, ship **first orchestration**:

- **`machine.ts`** — pure xstate definition + named guards (policy → human → evidence → auto-advance)
- **`orchestrator.script.ts`** — actor wiring machine + Executor + `WorkflowRunWriter`
- **Snapshot persist/hydrate** (AWO-4.2) and **graceful shutdown + resume** (AWO-13)
- **CLI** — canonical `mise run spec workflow resume` (M1-CLI-01/02)

Exercise **AWO-2 AC3–4** (`evidence_pending`, no false-positive transitions) through the running machine, not isolated unit tests alone.

## Project overrides (read before coding)

- **Load skills:** `app-context`, `app-testing`, `mise-tasks`
- **Bun runtime**; `bun test`, `bun run`. No Node/Jest/Vitest.
- **TypeBox only** for validation (`Type.*` + `Value.Check`). **No Zod.**
- **No `bun:sqlite`** — run state is NDJSON + JSON snapshot files per [`OBSERVABILITY_GUIDE.md`](../../guides/OBSERVABILITY_GUIDE.md).
- **Co-located specs** for every new file; **no mocking** — real file I/O with `mkdtemp` scratch dirs and fixture profiles under `tools/__tests__/fixtures/workflow/`.
- **Naming**: `snake_case.script.ts` / `*.schema.ts` / `machine.ts` (L1 pure); ls-lint + Biome enforce.
- **Logging**: `getLogger(['kb','tools','spec','workflow', …])`; never `console.*`.
- Work lives in `tools/`, **not** `src/`. The renderer MUST NOT import the runtime.

## Non-negotiable architecture (review 002)

1. **Four layers.** L1 Engine (pure) → L2 Runtime adapter (I/O) → L3 Profile/catalog → L4 CLI. **L1 MUST NOT** contain `mise`/`hk`/`bun`/`gh`/`speckit` identifiers in constants, defaults, or type names.
2. **Executor port.** Stage commands go through L2 (`command_invoker.script.ts`, `workflow_invoker.script.ts`); subprocess spawn only in declared L2 adapters (ast-grep enforced).
3. **No engine command inventory.** Prefixes are profile data (`execution_policy.allowed_prefixes`); kb values live only in `default.yaml` + fixtures.
4. **Reuse, don't fork.** Extend `WorkflowEvent` + `WorkflowRunWriter`; compose `detectPhase()` — no second writer or phase detector.
5. **Dispatch via profile `command:` only** — no inline `speckit.*` in `orchestrator.script.ts`.
6. **Envelope from file** — read `tmp/workflow-runs/<date>/<run_id>.envelope.<stage>.json`; never parse stdout.
7. **Engine tests** use fixture profiles + stub commands (`echo`, `bun run fixtures/…`) — never the kb toolchain in L1 specs.

## Implementation tasks (Phase 4 — mark `[X]` in tasks.md when done)

### ENGINE (L1)

- [ ] **M1-ENGINE-01** `machine.ts` — xstate machine + guards; guard matrix spec in co-located `machine.spec.ts` (AWO-1.1, AWO-2.3)
- [ ] **M1-ENGINE-02** teardown actors — fire-and-forget, `teardown_timeout_ms` (default 30s), `task.*` telemetry, never gate transition (AWO-5.5)
- [ ] **M1-ENGINE-03** snapshot persist/hydrate over `PersistedRunState`; mid-`evidence_pending` and mid-`retrying` rehydrate (AWO-4.2)

### ADAPTER (L2)

- [ ] **M1-ADAPTER-01** `orchestrator.script.ts` — wire machine + Executor + writer; seams via profile `command:` only; static check: no inline `speckit.*` (AWO-5.1)
- [ ] **M1-ADAPTER-02** SIGINT/SIGTERM trap → `blocked` + `SHUTDOWN_REQUESTED`; atomic snapshot; `idempotency_key` on resume (AWO-13.1–13.4)

### CLI (L4)

- [ ] **M1-CLI-01** Canonical **`mise run spec workflow resume`**; document in [`WORKFLOW_GUIDE.md`](../../guides/WORKFLOW_GUIDE.md); reconcile spec/plan refs; add `resume` to `ALLOWED_WORKFLOW_NAMES` in `tools/bin/spec.script.ts`
- [ ] **M1-CLI-02** `resume [<run_id>] --answer <qid>=<value>` / `--approve <stage>` — default run_id, ambiguous-run error list; minimal shared-memory apply for answers/approvals (AWO-3.4, AWO-5.4)

### Closeout

- [ ] **M1-CLOSEOUT-01** all Verify commands green; Phase 4 tasks `[X]` in [`tasks.md`](./tasks.md)

## Maintainer AC checklist (M1 slice)

Each row is verified by the named Evidence; check only when the test is green.

| ID         | Done when                                                                               | Evidence                                                                                  |
| ---------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| AWO-1 AC1  | `DONE` + verified evidence auto-advances on fixture profile                             | `bun test --config /dev/null tools/governance/specs/workflow/machine.spec.ts`             |
| AWO-1 AC3  | `BLOCKED` stops progression; blocker summary with diagnostics                           | `bun test --config /dev/null tools/governance/specs/workflow/machine.spec.ts`             |
| AWO-2 AC3  | `DONE` claim without passing evidence stays `evidence_pending`                          | `bun test --config /dev/null tools/governance/specs/workflow/orchestrator.script.spec.ts` |
| AWO-2 AC4  | unverifiable evidence does not auto-advance                                             | `bun test --config /dev/null tools/governance/specs/workflow/orchestrator.script.spec.ts` |
| AWO-4 AC2  | cold resume rehydrates snapshot; no double-dispatch                                     | `bun test --config /dev/null tools/governance/specs/workflow/orchestrator.script.spec.ts` |
| AWO-5 AC1  | dispatch via profile `command:`; envelope from file; missing file → `BLOCKED` not crash | `bun test --config /dev/null tools/governance/specs/workflow/orchestrator.script.spec.ts` |
| AWO-5 AC4  | `human_gated` stage pauses until `--approve`                                            | `bun test --config /dev/null tools/governance/specs/workflow/orchestrator.script.spec.ts` |
| AWO-5 AC5  | teardown actors non-blocking; transition latency unaffected                             | `bun test --config /dev/null tools/governance/specs/workflow/machine.spec.ts`             |
| AWO-13 AC1 | SIGINT/SIGTERM → graceful `blocked` + `SHUTDOWN_REQUESTED`                              | `bun test --config /dev/null tools/governance/specs/workflow/orchestrator.script.spec.ts` |
| AWO-13 AC2 | atomic snapshot on shutdown; no orphaned `.tmp`                                         | `bun test --config /dev/null tools/governance/specs/workflow/orchestrator.script.spec.ts` |
| AWO-13 AC3 | resume honors `idempotency_key`; no double-dispatch                                     | `bun test --config /dev/null tools/governance/specs/workflow/orchestrator.script.spec.ts` |
| M1-CLI AC1 | `spec workflow resume` routed; documented; unknown workflow rejected                    | `bun test --config /dev/null tools/bin/spec.script.spec.ts`                               |

> Full AWO-3 (intervention minimizer) and AWO-7 (memory model) are **M2** — M1-CLI-02 only needs minimal shared-memory read/write for `--answer` / `--approve`, not `memory.script.ts`.

## Pitfalls (MVP solved — don't reintroduce)

- **Toolchain leak into L1** — no `mise`/`hk` constants in `machine.ts` or guards.
- **Second NDJSON writer** — extend `WorkflowRunWriter` only.
- **stdout envelope parsing** — file path only.
- **`spec resume` vs `spec workflow resume`** — resolve in M1-CLI-01 **before** wiring resume routing.
- **Implementing M2+ in this branch** — out of scope; open a new branch after M1 merges.

## Verify (claim done only when all exit 0)

```sh
bun test --config /dev/null tools/governance/specs/workflow/
bun test --config /dev/null tools/bin/spec.script.spec.ts
bun run lint:ast-grep
mise run spec lint assets/specs/009-agentic-workflow-orchestrator
mise run spec gate assets/specs/009-agentic-workflow-orchestrator
```

Operator before merge: `/app-review-handoff` on this file.

## Out of scope (this handoff)

- M2 (AWO-3/7 full memory), M3 (AWO-6 PR/CI), M4 (AWO-8/11 retrospective/sandbox enforcement)
- `PROFILE-SDD-*`, `SMOKE-*`
- `packages/workflow-*`, `src/` changes, `hk.pkl` / `mise.toml` beyond doc refs
- Committing or opening a PR — only when the operator asks

## Suggested commit (operator, after review)

```sh
git add tools/governance/specs/workflow/ tools/bin/spec.script.ts assets/guides/WORKFLOW_GUIDE.md assets/specs/009-agentic-workflow-orchestrator/

git commit -m "$(cat <<'EOF'
feat(workflow): add M1 orchestrator slice

Wire xstate machine, orchestrator actor, graceful shutdown, and
spec workflow resume on the 009 MVP substrate (AWO-1, 5, 13).

EOF
)"
```

## Post-commit (operator)

```sh
git push -u origin HEAD

gh pr create \
  --title "feat(workflow): 009 M1 orchestrator slice" \
  --body "$(cat <<'EOF'
## Summary
- Add xstate `machine.ts` with guard precedence and teardown actors
- Add `orchestrator.script.ts` for stage dispatch, evidence gates, and shutdown
- Add `mise run spec workflow resume` CLI (M1-CLI-01/02)

## Test plan
- [x] `bun test --config /dev/null tools/governance/specs/workflow/`
- [x] `bun test --config /dev/null tools/bin/spec.script.spec.ts`
- [x] `mise run spec gate assets/specs/009-agentic-workflow-orchestrator`
- [x] `/app-review-handoff` on handoff.md

EOF
)"
```

## Roadmap (not in scope — promote to handoff.md after M1 merges)

| Slice  | Phase | Requirements                                               | PR  |
| ------ | ----- | ---------------------------------------------------------- | --- |
| **M2** | 5     | AWO-3, AWO-7 — intervention minimizer + `memory.script.ts` | 3   |
| **M3** | 6     | AWO-6 — PR/CI completion (Post-MVP)                        | 4   |
| **M4** | 7     | AWO-8, AWO-11 — retrospective + sandbox enforcement        | 5+  |

Optional carry-forward from MVP review (non-blocking for M1): envelope `BLOCKED` semantics in `envelope_capture`, tighter `no-spawn-outside-adapter` ignore list.
