<!-- markdownlint-disable-file -->

# Handoff — Agentic workflow orchestrator (`009`)

**Spec:** [`spec.md`](./spec.md) (AWO-1…AWO-13) · **Plan:** [`plan.md`](./plan.md) · **Tasks:** [`tasks.md`](./tasks.md)
**Architecture:** [`review/002/tool-agnostic-engine-review.md`](./review/002/tool-agnostic-engine-review.md) (4-layer engine)
**Immediate target:** the **MVP slice** (PR 1). M1–M4 are subsequent PRs in the same spec.

## Mission

Extend the existing workflow tree at `tools/governance/specs/workflow/` with a
**tool-agnostic** orchestration engine. Ship the MVP substrate first —
schemas, the `Executor` adapter (profile-owned prefix policy), the profile
loader, persistence (reusing `WorkflowRunWriter`), and a Layer-B conformance
test — **without** a state machine (that is M1).

## Project overrides (read before coding)

- **Bun runtime**; `bun test`, `bun run`. No Node/Jest/Vitest.
- **TypeBox only** for validation (`Type.*` + `Value.Check`). **No Zod.**
- **No `bun:sqlite`** for this feature — run state is NDJSON + JSON snapshot files per [`OBSERVABILITY_GUIDE.md`](../../guides/OBSERVABILITY_GUIDE.md).
- **Co-located specs** for every new file; **no mocking** — real file I/O with `mkdtemp` scratch dirs and fixture profiles.
- **Naming**: `snake_case.script.ts` / `*.schema.ts`; ls-lint + Biome enforce.
- **Logging**: `getLogger(['kb','tools','spec','workflow', …])`; never `console.*`.
- Work lives in `tools/`, **not** `src/`. The renderer MUST NOT import the runtime.

## Non-negotiable architecture (review 002)

1. **Four layers.** L1 Engine (pure) → L2 Runtime adapter (I/O) → L3 Profile/catalog → L4 CLI. **L1 MUST NOT** contain `mise`/`hk`/`bun`/`gh`/`speckit` identifiers in constants, defaults, or type names.
2. **Executor port.** All execution goes through one L2 adapter (`command_invoker.script.ts`); `Bun.spawn` lives only there (ast-grep enforced).
3. **No engine command inventory / no `DEFAULT_COMMAND_ALLOWLIST`.** Prefixes are profile data (`execution_policy.allowed_prefixes`); kb values live only in `default.yaml` + fixtures. The validation *algorithm* may be pure; *values* never are.
4. **Reuse, don't fork.** Extend the existing `WorkflowEvent` union + `WorkflowRunWriter`; compose `detectPhase()` — don't write a second writer or detector.
5. **Layer B asserts stage graph order** vs `detectPhase()`/SDD, **not** that every `command:` string exists or passes in CI.
6. **Engine tests use fixture profiles + stub commands** (`bun run fixtures/…`, `echo`) — never the kb toolchain.

## Maintainer AC checklist (MVP slice)

Each row is verified by the named Evidence; check only when the test is green.

| ID         | Done when                                                                                               | Evidence                                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| AWO-2 AC1  | Envelope schema validates and `EvidenceEntry.kind` is toolchain-neutral (`command`/`artifact`/`marker`) | `bun test --config /dev/null tools/governance/specs/workflow/schemas/envelope.schema.spec.ts`                         |
| AWO-2 AC2  | Malformed/missing envelope yields `BLOCKED` + diagnostics (no crash)                                    | `bun test --config /dev/null tools/governance/specs/workflow/envelope_capture.script.spec.ts`                         |
| AWO-2 AC3  | `DONE` claim transitions only when evidence verifies; else `evidence_pending`                           | `bun test --config /dev/null tools/governance/specs/workflow/evidence.script.spec.ts`                                 |
| AWO-9 AC1  | Single Executor adapter; no inline spawn in engine modules                                              | `bun run lint:ast-grep && bun test --config /dev/null tools/governance/specs/workflow/command_invoker.script.spec.ts` |
| AWO-9 AC2  | Prefix check uses the profile's `execution_policy.allowed_prefixes`; no engine defaults                 | `bun test --config /dev/null tools/governance/specs/workflow/execution_policy.script.spec.ts`                         |
| AWO-9 AC3  | Missing command target yields `BLOCKED` + `COMMAND_TARGET_MISSING`                                      | `bun test --config /dev/null tools/governance/specs/workflow/envelope_capture.script.spec.ts`                         |
| AWO-9 AC4  | `task.invoked`/`task.completed` telemetry flows through the existing writer                             | `bun test --config /dev/null tools/governance/specs/workflow/workflow_invoker.script.spec.ts`                         |
| AWO-10 AC1 | Profile load validates `execution_policy` and fail-fasts on missing/empty                               | `bun test --config /dev/null tools/governance/specs/workflow/profile_loader.script.spec.ts`                           |
| AWO-4 AC1  | Snapshot atomic write + terminal dual-write to `tools/metrics/`                                         | `bun test --config /dev/null tools/governance/specs/workflow/persistence.script.spec.ts`                              |
| AWO-12 AC1 | `default.yaml` stage order matches `detectPhase()`                                                      | `bun test --config /dev/null tools/governance/specs/workflow/conformance.script.spec.ts`                              |
| AWO-12 AC2 | 009 events are additive members of the existing `WorkflowEvent` union                                   | `bun test --config /dev/null tools/governance/specs/workflow/workflow_run.script.spec.ts`                             |
| AWO-11 AC1 | `sandbox` is optional; a profile omitting it loads                                                      | `bun test --config /dev/null tools/governance/specs/workflow/schemas/profile.schema.spec.ts`                          |

> AWO-4.2 (resume), AWO-1/5/13 (machine, dispatch, shutdown), AWO-3/7 (intervention, memory), AWO-6/8/11 (PR-CI, retrospective, sandbox enforcement) are **M1–M4** — see [`tasks.md`](./tasks.md) phases 4–7.

## Pitfalls (already solved — don't reintroduce)

- **Toolchain leak into L1.** Putting `'mise run'` / `'hk check'` constants or `mise_task`/`hk_profile` type literals in engine modules. Keep them in `default.yaml` + fixtures only. (The `EvidenceEntry.kind` neutralization in MVP-ENGINE-01 exists for exactly this.)
- **Second NDJSON writer / second phase detector.** Extend `WorkflowRunWriter` and compose `detectPhase()`; the `runs` CLI and retention already depend on them.
- **stdout envelope parsing.** Capture the worker envelope from `<run_id>.envelope.<stage>.json`, never stdout.
- **`spec resume` vs `spec workflow resume`** naming drift — resolve in **M1-CLI-01** before wiring routing; reconcile all spec/plan references.
- **`default.yaml` stage ids out of order.** They must match `detectPhase()`: `specify → plan → analyze-plan → tasks → analyze-tasks → handoff-generate → implement → review`.

## Verify (each slice ends with)

```sh
bun test --config /dev/null tools/governance/specs/workflow/
mise run spec lint assets/specs/009-agentic-workflow-orchestrator
mise run spec gate
```

## Out of scope (this handoff)

- `machine.ts` / orchestrator actor (M1, not MVP).
- Creating `packages/workflow-*` directories.
- Editing `hk.pkl` / `mise.toml` beyond doc references.
- Production `src/` changes.
- `PROFILE-SDD-*` real bindings and `SMOKE-*` dogfood (optional, non-blocking).
- Committing — only when the operator asks.

## Next (after implement — review findings addressed)

P0 items from [`review-009-agentic-workflow-orchestrator-630a15c1.md`](review/review-009-agentic-workflow-orchestrator-630a15c1.md):
- Added 8 worker fixture functions + switch cases in `workflow_run.script.spec.ts` (AWO-12 AC2)
- Fixed handoff AC table evidence paths to `*.script.spec.ts`; re-routed AC2 → `envelope_capture`, AC4 → `workflow_invoker`

P1 items deferred to next handoff:
- `envelope_capture` needs `BLOCKED` + `COMMAND_TARGET_MISSING` diagnostic
- `no-spawn-outside-adapter` rule needs narrower ignore
- `handoff_generate.script.spec.ts` 4 dispatch tests fail (missing `tmp/handoffs`)
