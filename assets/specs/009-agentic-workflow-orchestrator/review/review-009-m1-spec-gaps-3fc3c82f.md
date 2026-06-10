# Fix handoff — 009 M1 spec + behavior gaps — review `3fc3c82f`

**Verdict source:** `tmp/reviews/review-009-agentic-workflow-orchestrator-3fc3c82f.md` (`REQUEST_CHANGES`)  
**Prior handoff:** `tmp/handoffs/review-009-agentic-workflow-orchestrator-m1-gaps-8ebf5f84.md`  
**Branch:** `feature/009-m4-retro-sandbox` · **Base:** `3fc3c82f` · **Feature:** `assets/specs/009-agentic-workflow-orchestrator/`

Async teardown **structure** from `3fc3c82f` is accepted — **do not revert** `teardown_runner.script.ts` or the non-blocking `stage.exited` placement. This pass closes **missing normative specs**, **two behavior bugs**, and **checkbox honesty**.

**Load skills:** `app-context`, `app-testing`, `mise-tasks`.

**Do not commit unless the operator asks.**

---

## Agent prompt (copy from here)

You are finishing **009 M1** after commit `3fc3c82f`. Async teardown wiring is in place; you must add the **co-located specs the prior handoff required**, fix **seed key mismatch** and **teardown abort kill**, and align **tasks.md** checkboxes with evidence.

---

## P0 — Fix `seedDispatchedKeys` key mismatch (AWO-13.3)

### Bug

`orchestrator_resume.script.ts` line 27 seeds:

```ts
envelope.idempotency_key ?? `${runId}:${stage}:<unknown>`
```

`dispatchStageCommand` uses:

```ts
existingEnvelope?.idempotency_key ?? `${this.runId}:${stage}:${command}`
```

When envelopes lack `idempotency_key`, resume re-dispatches workers.

### Fix (exact)

1. Change `seedDispatchedKeys` signature to:

```ts
export function seedDispatchedKeys(
  runDir: string,
  runId: string,
  stageCommands: Record<string, string>,
  addKey: (key: string) => void
): void
```

2. Inside the loop, after parsing `envelope` and `stage`:

```ts
const command = stageCommands[stage] ?? ''
addKey(envelope.idempotency_key ?? `${runId}:${stage}:${command}`)
```

3. Update `Orchestrator.seedDispatchedKeysFromDisk()` to pass `this.config.stageCommands`.

4. Add **`orchestrator_resume.script.spec.ts`** with:
   - Envelope on disk without `idempotency_key`, `stageCommands: { specify: 'echo worker' }` → seeded key equals `${runId}:specify:echo worker`.

5. Add **`orchestrator.script.spec.ts`** test **`AWO-13.3: second dispatch skips invoke when envelope exists`**:
   - Write valid envelope file to `runDir`.
   - Call `dispatchStageCommand` twice for same stage.
   - Assert `task.invoked` count for `trigger.pre` is **1** (parse NDJSON or spy writer).

---

## P0 — Fix teardown `abort()` to kill subprocess (AWO-13.4)

### Bug

`teardown_runner.script.ts` `abort()` sets `aborted = true` but the `Bun.spawn` child keeps running.

### Fix (exact)

1. Refactor `runCommandAsync` in `command_invoker.script.ts` to return:

```ts
export type AsyncCommandHandle = {
  promise: Promise<CommandResult>
  kill: () => void
}
export function runCommandAsync(...): AsyncCommandHandle
```

- Store `proc` from `Bun.spawn`; `kill()` calls `proc.kill()`.
- On kill, resolve promise with `exitCode: -1`, `rejected: true`, appropriate stderr.

2. In `spawnTeardownFireAndForget`, capture handle from `runCommandAsync`; `TeardownHandle.abort` calls `handle.kill()`.

3. Extend **`teardown_runner.script.spec.ts`**:
   - Spawn `sleep 10` with short timeout; call `abort()` immediately; assert `task.completed` has `status: 'cancelled'` and process settles in &lt; 500ms wall clock.

---

## P0 — AWO-5.5 co-located specs (M1-ENGINE-02)

Add to **`orchestrator.script.spec.ts`** (extend fixture profile YAML under `tools/__tests__/fixtures/workflow/`):

### Test 1 — `AWO-5.5: stage.exited precedes slow teardown task.completed`

- Add stage `teardown-slow` with `teardown: ['sleep 1']` and allowed prefix `sleep` in fixture profile (or `bun -e "Bun.sleep(1000)"` if `bun` is in allowed prefixes).
- Run minimal orchestrator path that hits teardown block (mock stage completion + teardown section; use existing `makeOrchestratorConfig` pattern).
- Parse `${runDir}/*.ndjson` (or `writer` events): assert `stage.exited` line index **&lt;** teardown `task.completed` line index for that stage.

### Test 2 — `AWO-5.5: teardown timeout injection`

- Stage with `teardown: ['sleep 5']`, `teardown_timeout_ms: 100`.
- Assert teardown `task.completed` within **300ms** wall clock with `status: 'fail'` or `rejected` outcome.
- Assert `stage.exited` already emitted before that `task.completed`.

**Only mark M1-ENGINE-02 `[X]` after both tests pass.**

---

## P1 — Shutdown grace timing spec (AWO-13.1)

Add **`orchestrator.script.spec.ts`** test **`AWO-13.1: shutdown.completed after grace_ms`**:

- Fixture profile with `shutdown.grace_ms: 50`.
- Call `await orc.shutdown('SIGTERM')`.
- Parse NDJSON: elapsed between `shutdown.requested` and `shutdown.completed` timestamps ≥ **45ms**.

---

## P1 — Resume CLI cleanup + specs (M1-CLI-02)

### Code

**File:** `tools/governance/specs/workflow_run.script.ts` (CLI entry, **not** `workflow/workflow_run.script.ts`)

Delete lines **202–225** (the block that prints `Latest: …` and exits 2 when `--run-id` missing). Replace with:

```ts
if (!runId) {
  console.error('spec workflow resume: --run-id required')
  process.exit(2)
}
```

`spec.script.ts` is solely responsible for defaulting `run_id`.

### Specs

**File:** `tools/bin/spec.script.spec.ts`

Import `findActiveRun`, `listActiveRuns` from `../governance/specs/workflow/workflow_run.script.ts`.

Add tests with `mkdtempSync` under `tmp/workflow-runs/<YYYY-MM-DD>/`:

1. **`findActiveRun returns sole run id`** — one `foo.state.json` → `findActiveRun()` === `'foo'`.
2. **`listActiveRuns sorted with two runs`** — two state files → `findActiveRun()` === `null`, `listActiveRuns().length === 2`.

**Only mark M1-CLI-02 `[X]` after these tests pass.**

---

## P1 — `runCommandAsync` unit spec

**File:** `command_invoker.script.spec.ts`

Add describe block **`runCommandAsync`**:

- `echo async` → exit 0, stdout captured.
- disallowed prefix → rejected without spawn.
- timeout: `sleep 2` with `timeout_ms: 100` → killed within 200ms.

---

## P2 — tasks.md honesty

At **start** of this pass, if M1-ENGINE-02 / M1-ADAPTER-02 / M1-CLI-02 are `[X]` without the new specs green, set them `[ ]`.

After all specs pass, set `[X]` and update reconciliation §Still open rows to cite spec test names (not just module paths).

**Do not** mark SMOKE-01 or PROFILE-SDD-01.

---

## Touch list

| File                                                                 | Action                               |
| -------------------------------------------------------------------- | ------------------------------------ |
| `tools/governance/specs/workflow/orchestrator_resume.script.ts`      | Fix seed key + signature             |
| `tools/governance/specs/workflow/orchestrator_resume.script.spec.ts` | **New**                              |
| `tools/governance/specs/workflow/command_invoker.script.ts`          | `AsyncCommandHandle` + kill          |
| `tools/governance/specs/workflow/command_invoker.script.spec.ts`     | `runCommandAsync` tests              |
| `tools/governance/specs/workflow/teardown_runner.script.ts`          | Wire kill through abort              |
| `tools/governance/specs/workflow/teardown_runner.script.spec.ts`     | Abort kill test                      |
| `tools/governance/specs/workflow/orchestrator.script.ts`             | Pass `stageCommands` to seed         |
| `tools/governance/specs/workflow/orchestrator.script.spec.ts`        | AWO-5.5, AWO-13.1, AWO-13.3 tests    |
| `tools/governance/specs/workflow_run.script.ts`                      | Remove stale resume fallback         |
| `tools/bin/spec.script.spec.ts`                                      | findActiveRun / listActiveRuns tests |
| `tools/__tests__/fixtures/workflow/fixture-profile.yaml`             | Slow-teardown stage if needed        |
| `assets/specs/009-agentic-workflow-orchestrator/tasks.md`            | Checkbox sync                        |

---

## Verify (all exit 0)

```sh
bun test --config /dev/null tools/governance/specs/workflow/
bun test --config /dev/null ./tools/governance/specs/workflow_run.script.spec.ts
bun test --config /dev/null tools/bin/spec.script.spec.ts
bun run lint:ast-grep
mise run spec lint assets/specs/009-agentic-workflow-orchestrator
mise run spec gate assets/specs/009-agentic-workflow-orchestrator
bash .agents/skills/app-quality-gate/scripts/gate.sh
```

---

## Commit message (when operator asks)

```text
test(workflow): M1 AWO-5.5/13 specs and resume seed fix

Co-located latency, timeout, idempotency, grace, and resume specs;
fix seedDispatchedKeys composite key; teardown abort kills child.
```

---

## Anti-patterns

- **Do not** revert async teardown or re-inline synchronous `invokeWithTelemetry` for teardown.
- **Do not** mark M1 tasks `[X]` without the named specs above.
- **Do not** implement SMOKE-01 or PROFILE-SDD-01 in this pass.
