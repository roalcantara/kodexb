# Workflow perf harness

Baseline budgets live at `tools/metrics/baselines/workflow.json`.

Run with:

```sh
mise run workflow perf
```

Or manually:

```sh
bun tools/metrics/harnesses/workflow/perf.script.ts
```

## Metrics collected

| Metric | p95 budget | Collection method |
|--------|-----------|-------------------|
| Stage transition | 50ms | `performance.now()` around `STAGE.COMPLETE` guard eval |
| Profile load | 100ms | `performance.now()` around `loadProfile()` |
| Event append | 5ms | `performance.now()` around `WorkflowRunWriter.emit()` single call |
| Cold resume | 250ms | `performance.now()` around `hydrateMachineActor()` |

Results written to `tools/metrics/results/workflow/latest.json`.
