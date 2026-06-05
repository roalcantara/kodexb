# Performance benchmarks (PERF-0)

Observability baseline for the **preview server** (`tools/preview/server.script.ts`):
same HTTP RPC surface the renderer uses via the fetch mock
(`tools/preview/mock_electroview.script.ts`). This is not a full Electrobun WebView
load test.

The benchmark task is defined in the root [`mise.toml`](../../mise.toml) as
one usage-driven task. Run it from the repo root with `mise run perf <action>`.

**P1 cold start** includes the preview server’s first `Bun.build` of the renderer; the harness waits up to **90 s** for `GET /` to return 200 before failing.

## Five critical paths

| ID     | What is measured                                                                                       | Threshold                     | Rationale                                                  |
| ------ | ------------------------------------------------------------------------------------------------------ | ----------------------------- | ---------------------------------------------------------- |
| **P1** | Cold start: spawn `bun tools/preview/server.script.ts` with `PORT=3457`, time until first `GET /` returns 200 | &lt; 300 ms                 | Snappy dev / preview feedback with CI headroom             |
| **P2** | FTS: `POST /api/list` with `{ "query": "bun", "limit": 50 }` — p50 / p99 over 100 samples              | p50 &lt; 2 ms, p99 &lt; 4 ms | Keeps list search comfortably below frame budget           |
| **P3** | Type filter: `POST /api/list` with `{ "types": ["task"], "limit": 50 }` — p50 / p99                    | p50 &lt; 2 ms, p99 &lt; 3 ms | Exercises `AppService.list` filter path                    |
| **P4** | Throughput: 10 s, 10 concurrent inline fetch workers, `POST /api/list` with FTS body                   | ≥ 8000 req/s                | Sustained RPC load sanity check                            |
| **P5** | Stats: `POST /api/getStats` — p50 / p99 over 100 samples                                               | p50 &lt; 3 ms, p99 &lt; 5 ms | Stats panel should stay lighter than list                  |

Browser **FCP** is out of scope (needs a real WebView driver).

## Commands

| Command                  | Purpose                                                                                                                                                                                                                                              |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mise run perf run`      | Run all five paths, write `results/<ISO-slug>/result.json` and `results/latest.json`, exit 1 if any threshold fails                                                                                                                                  |
| `mise run perf run --port <port>` | Run on a non-default preview port when `3457` is already in use                                                                                                                                                                             |
| `mise run perf baseline` | Copy `latest.json` → `baseline.json` (commit the latter to lock numbers for your machine/CI later)                                                                                                                                                   |
| `mise run perf compare`  | Diff `latest.json` vs `baseline.json`. **Throughput** (P4): fail if latest is **&gt; 20%** below baseline. **Latency** (P1–P3, P5): fail only if latest is worse *and* `Δ ≥ max(0.25 ms, 20% of baseline)` — avoids false fails on sub-ms p99 noise. |
| `mise run perf open`     | macOS: `open` the folder for the run referenced by `latest.json`                                                                                                                                                                                     |

## Artifact schema (`result.json` / `latest.json` / `baseline.json`)

```json
{
  "timestamp": "2026-04-26T14:00:00.000Z",
  "git_sha": "<40-char hash>",
  "bun_version": "1.x.x",
  "thresholds": {
    "p1_cold_start_ms": 300,
    "p2_p50_ms": 2,
    "p2_p99_ms": 4,
    "p3_p50_ms": 2,
    "p3_p99_ms": 3,
    "p4_req_per_sec": 8000,
    "p5_p50_ms": 3,
    "p5_p99_ms": 5
  },
  "results": {
    "p1_cold_start_ms": 0,
    "p2_p50_ms": 0,
    "p2_p99_ms": 0,
    "p3_p50_ms": 0,
    "p3_p99_ms": 0,
    "p4_req_per_sec": 0,
    "p5_p50_ms": 0,
    "p5_p99_ms": 0
  },
  "violations": [],
  "summary": "PASS"
}
```

Each violation object: `{ "path", "metric", "value", "threshold", "delta" }`. `summary` is `"PASS"` or `"FAIL"`.

## Git / results layout

- **Tracked:** `results/baseline.json` (after you promote), this README, `mise.toml`.
- **Ignored:** `results/*/` (per-run folders), `results/latest.json`.

## CI

Will be wired as a **nightly workflow** in a future task; not part of the default PR gate yet.

## Preview server port

Benchmarks set `PORT=3457` so they do not collide with a dev preview on the default **3456**. The preview server reads `process.env.PORT` when set.
