# Fix handoff — 009 M2 intervention-memory — review 2fd3b5b5

Load: `app-context` + `app-testing` + `mise-tasks`

Branch: continue on `feature/009-m2-intervention-memory` (amend or follow-up commit).

## P0

1. **`tools/governance/specs/workflow_run.script.spec.ts`** (new, co-located with CLI entry)
   - Test `parseWorkflowArgs` for `--answer qid=value`, `--run-id`, `--approve`
   - Resume path: hydrate fixture snapshot in `need_input`, apply `--answer`, assert shared JSON + `decision.answered` in NDJSON (use mkdtemp + minimal state fixture)
   - Malformed `--answer` exits 2
   - Verify: `bun test --config /dev/null ./tools/governance/specs/workflow_run.script.spec.ts`

2. **`tools/governance/specs/workflow/orchestrator.script.ts`**
   - Import and call `dedupQuestions`, `autoFillValues`, `createDefaultedDecision` at human-gated / `need_input` boundaries (per M2-ENGINE-01)
   - Emit `decision.defaulted` via `WorkflowRunWriter`; persist defaults via `writeSharedMemory`
   - Verify: `bun test --config /dev/null tools/governance/specs/workflow/`

## P1

- Add integration test for AWO-3 AC3 (shared memory + `decision.defaulted` event); update `handoff.md` Evidence row if file moves
- Mark Phase 5 `[X]` checkboxes in `handoff.md` (tasks.md already done)
- Optional: `WORKFLOW_RUNTIME_GUIDE.md` § resume `--answer` / `--approve` (handoff optional note)

## Out of scope

M3, M4, POLISH-02 NFR harness, `src/` changes.

## Before done

```sh
bun test --config /dev/null tools/governance/specs/workflow/
bun test --config /dev/null ./tools/governance/specs/workflow_run.script.spec.ts
mise run spec lint assets/specs/009-agentic-workflow-orchestrator
mise run spec gate assets/specs/009-agentic-workflow-orchestrator
```

Do not commit unless operator asks.
