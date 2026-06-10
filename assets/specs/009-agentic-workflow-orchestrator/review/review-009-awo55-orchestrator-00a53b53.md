# Fix handoff — 009 AWO-5.5 orchestrator specs + resume cleanup — review `00a53b53`

**Verdict source:** `tmp/reviews/review-009-agentic-workflow-orchestrator-00a53b53.md` (`REQUEST_CHANGES`)  
**Prior handoff:** `assets/specs/009-agentic-workflow-orchestrator/review/review-009-m1-spec-gaps-3fc3c82f.md`  
**Branch:** `feature/009-m4-retro-sandbox` · **Base:** `00a53b53` · **Feature:** `assets/specs/009-agentic-workflow-orchestrator/`

Everything from `00a53b53` is **keep** — seed fix, abort kill, AWO-13.1/13.3, resume helper specs, `runCommandAsync` tests. This pass adds the **two missing AWO-5.5 orchestrator integration tests**, removes the **stale resume CLI block**, and fixes **tasks.md** honesty.

**Load skills:** `app-context`, `app-testing`.

**Do not commit unless the operator asks.**

---

## Agent prompt (copy from here)

You are closing the **last 009 M1 gap** after `00a53b53`. Unit-level teardown tests exist; **AWO-5.5 AC5** still requires **orchestrator-level** proof that `stage.exited` does not wait on teardown. Add those two tests exactly as specified below.

---

## P0 — AWO-5.5 orchestrator integration specs (M1-ENGINE-02)

`command_invoker.script.spec.ts` and `teardown_runner.script.spec.ts` **do not satisfy** this requirement. Tests **must** live in `orchestrator.script.spec.ts` and exercise the teardown block in `orchestrator.script.ts` (lines ~363–388).

### Step 1 — Extend fixture profile

**File:** `tools/__tests__/fixtures/workflow/fixture-profile-teardown.yaml` (**new**, do not mutate base `fixture-profile.yaml`)

```yaml
schema_version: 009.1.0
name: fixture-teardown
execution_policy:
  allowed_prefixes: ["echo", "sleep", "bun run", "mkdir"]
stages:
  - id: teardown-slow
    worker: primary
    teardown: ["sleep 1"]
    teardown_timeout_ms: 30000
  - id: teardown-timeout
    worker: primary
    teardown: ["sleep 5"]
    teardown_timeout_ms: 100
transitions:
  - from: teardown-slow
    to: teardown-timeout
    on: DONE
terminal: [teardown-timeout]
default_retry: { max_attempts: 1, backoff: fixed, base_ms: 0, cap_ms: 0, jitter: none, reset_on_new_cause: false, escalation_event: stage.escalated }
memory: { conflict: prefer_latest, retention: { tmp_days: 1, durable_days: 1 } }
providers: {}
shutdown: { grace_ms: 10000, signals: [SIGINT, SIGTERM] }
```

Adjust YAML to match `ProfileSchema` validation (copy missing required fields from `fixture-profile.yaml` if lint fails).

### Step 2 — Test helper `runStageWithTeardown`

In **`orchestrator.script.spec.ts`**, add a helper that:

1. Builds `Orchestrator` with `loadProfile('tools/__tests__/fixtures/workflow/fixture-profile-teardown.yaml')`.
2. Sets `stageCommands: { 'teardown-slow': 'echo done', 'teardown-timeout': 'echo done' }`.
3. Pre-writes a valid `DONE` envelope for the target stage into `orc.runDir` (reuse `writeEnvelope`).
4. Calls the **minimal path** to hit post-trigger teardown + `stage.exited`:
   - Either extract a package-visible method, **or** run `orc.run()` with `continueOnBlocked: true` and a profile containing only one stage (preferred: single-stage variant profiles `fixture-teardown-slow.yaml` / `fixture-teardown-timeout.yaml` with one stage each to keep tests fast).

### Test 1 — `AWO-5.5: stage.exited precedes slow teardown task.completed`

- Profile: single stage `teardown-slow` with `teardown: ['sleep 1']`.
- After run, read `${orc.writer.currentPath}` NDJSON (or `readFileSync` on writer path).
- Parse lines as JSON; find first `stage.exited` for `teardown-slow` and first `task.completed` with `role: 'teardown'`.
- **Assert:** `stage.exited` line number **<** teardown `task.completed` line number (or compare `ts` ISO strings).

### Test 2 — `AWO-5.5: teardown timeout injection at orchestrator`

- Profile: single stage `teardown-timeout` with `teardown: ['sleep 5']`, `teardown_timeout_ms: 100`.
- Wall-clock: entire test body **< 800ms**.
- Assert `stage.exited` appears in NDJSON **before** teardown `task.completed`.
- Assert teardown `task.completed` has `status: 'fail'` (killed command).

**Only after both pass:** set M1-ENGINE-02 `[X]` and update reconciliation row to cite exact `it('AWO-5.5: …')` names.

---

## P0 — Strengthen AWO-13.3 (optional but required for M1-ADAPTER-02 closure)

**File:** `orchestrator.script.spec.ts` — extend existing test:

- Before second `dispatchStageCommand`, record NDJSON line count for `task.invoked` with `role: 'trigger.pre'`.
- After second call, assert count **unchanged** (still 1 or 0 if envelope pre-existed before any dispatch).

---

## P1 — Resume CLI cleanup

**File:** `tools/governance/specs/workflow_run.script.ts` lines **202–225**

**Delete** the entire `if (!runId) { … Latest … exit 2 }` block.

**Replace with:**

```ts
if (!runId) {
  console.error('spec workflow resume: --run-id required')
  process.exit(2)
}
```

No other behavior change — `spec.script.ts` already defaults `run_id`.

---

## P2 — tasks.md honesty

1. Until AWO-5.5 orchestrator tests pass: set **M1-ENGINE-02** to `[ ]`.
2. After pass: `[X]` and reconciliation line must quote test names, e.g. `AWO-5.5: stage.exited precedes slow teardown task.completed`.
3. **Do not** touch SMOKE-01 / PROFILE-SDD-01 (`[ ]` stays).

---

## Touch list

| File                                                               | Action                       |
| ------------------------------------------------------------------ | ---------------------------- |
| `tools/__tests__/fixtures/workflow/fixture-profile-teardown*.yaml` | **New** profile(s)           |
| `tools/governance/specs/workflow/orchestrator.script.spec.ts`      | 2× AWO-5.5 + strengthen 13.3 |
| `tools/governance/specs/workflow_run.script.ts`                    | Remove stale resume block    |
| `assets/specs/009-agentic-workflow-orchestrator/tasks.md`          | Checkbox sync                |

---

## Verify

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
test(workflow): AWO-5.5 orchestrator teardown ordering

Orchestrator-level stage.exited vs teardown latency specs;
remove stale workflow_run resume fallback.
```

---

## Anti-patterns

- **Do not** claim `teardown_runner.script.spec.ts` satisfies AWO-5.5 orchestrator AC5 — handoff requires `orchestrator.script.spec.ts`.
- **Do not** mark M1-ENGINE-02 `[X]` without both orchestrator integration tests.
- **Do not** implement SMOKE-01 or PROFILE-SDD-01 (010).
