/**
 * Preview-server performance harness — output under tmp/metrics/perf/.
 * Run via: mise run perf {run|baseline|compare|open}
 */
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { chdirToRepoRoot } from '../../../support/lib/shared/repo_root.script.ts'

const P50_QUANTILE = 0.5
const P99_QUANTILE = 0.99
const MS_PER_SECOND = 1000
const READINESS_POLL_MAX = 900
const READINESS_POLL_MS = 100
const DEFAULT_SAMPLE_COUNT = 100
const THROUGHPUT_DURATION_MS = 10_000
const THROUGHPUT_CONCURRENCY = 10
const ISO_SLUG_LEN = 19
const GIT_SHA_SHORT = 8
const DATE_SHORT = 10
const LATEST_JSON = 'latest.json'
const JSON_HEADERS = { 'Content-Type': 'application/json' }

const ROOT = chdirToRepoRoot()
const SERVER = path.join(ROOT, 'tools/dev/preview/server.script.ts')
const GENERATED_ROOT = path.join(ROOT, 'tmp/metrics/perf')
const RUNS_DIR = path.join(GENERATED_ROOT, 'runs')
const BASELINE_PATH = path.join(ROOT, 'tools/metrics/baselines/perf/baseline.json')

const PATH_SECTION: Record<BenchPath, string> = {
  p1: 'cold start',
  p2: 'FTS',
  p3: 'filter',
  p4: 'throughput',
  p5: 'stats'
}
const VIOLATION_METRICS = {
  cold_start: 'cold_start_ms',
  req_per_sec: 'req_per_sec'
} as const
const METRIC_SPECS = [
  { path: 'p1', stat: 'cold_start', limit: 300, kind: 'max', compareDir: 'lower', unit: 'ms', precision: 1 },
  { path: 'p2', stat: 'p50', limit: 2, kind: 'max', compareDir: 'lower', unit: 'ms', precision: 1 },
  { path: 'p2', stat: 'p99', limit: 4, kind: 'max', compareDir: 'lower', unit: 'ms', precision: 1 },
  { path: 'p3', stat: 'p50', limit: 2, kind: 'max', compareDir: 'lower', unit: 'ms', precision: 1 },
  { path: 'p3', stat: 'p99', limit: 3, kind: 'max', compareDir: 'lower', unit: 'ms', precision: 1 },
  { path: 'p4', stat: 'req_per_sec', limit: 8000, kind: 'min', compareDir: 'higher', unit: 'r/s', precision: 0 },
  { path: 'p5', stat: 'p50', limit: 3, kind: 'max', compareDir: 'lower', unit: 'ms', precision: 1 },
  { path: 'p5', stat: 'p99', limit: 5, kind: 'max', compareDir: 'lower', unit: 'ms', precision: 1 }
] as const

type MetricSpec = (typeof METRIC_SPECS)[number]
type BenchmarkResult = {
  timestamp: string
  git_sha: string
  bun_version: string
  thresholds: Record<string, number>
  results: Record<string, number>
  violations: Array<{ path: string; metric: string; value: number; threshold: number; delta: number }>
  summary: 'PASS' | 'FAIL'
}
type SpawnSyncOptions = NonNullable<Parameters<typeof Bun.spawnSync>[1]>

function envBool(name: string): boolean {
  const v = process.env[name]
  return v === '1' || v === 'true' || v === 'yes'
}

function workflowObservabilityArgs(): string[] {
  const args: string[] = []
  if (process.env.usage_regression_pct) args.push('--regression-pct', process.env.usage_regression_pct)
  if (process.env.usage_regression_min_delta_ms) {
    args.push('--regression-min-delta-ms', process.env.usage_regression_min_delta_ms)
  }
  if (process.env.usage_warmup) args.push('--warmup', process.env.usage_warmup)
  if (process.env.usage_iterations) args.push('--iterations', process.env.usage_iterations)
  if (process.env.usage_absolute_p95_ms) args.push('--absolute-p95-ms', process.env.usage_absolute_p95_ms)
  if (envBool('usage_no_regression')) args.push('--no-regression')
  if (envBool('usage_no_absolute_limits')) args.push('--no-absolute-limits')
  return args
}
type LatencySample = { p50: number; p99: number }
type BenchSamples = {
  p1: number
  p2: LatencySample
  p3: LatencySample
  p4: number
  p5: LatencySample
}
type BenchPath = 'p1' | 'p2' | 'p3' | 'p4' | 'p5'
type BenchStat = 'cold_start' | 'p50' | 'p99' | 'req_per_sec'
type BenchmarkMetric = MetricSpec & {
  key: string
  id: string
  metric: string
  label: string
  reportLabel: string
  valueFrom: (samples: BenchSamples) => number
}

export function isoSlug(timestamp: string): string {
  return timestamp.replace(/[:.]/g, '-').slice(0, ISO_SLUG_LEN)
}

function spawnText(cmd: string[], opts: SpawnSyncOptions = {}): string {
  const child = Bun.spawnSync(cmd, opts)
  if (!child.success) {
    throw new Error((child.stderr ?? Buffer.alloc(0)).toString().trim() || `${cmd.join(' ')} failed`)
  }
  return (child.stdout ?? Buffer.alloc(0)).toString().trim()
}

function resultKey(benchPath: BenchPath, stat: BenchStat): string {
  if (stat === 'req_per_sec') return `${benchPath}_req_per_sec`
  if (stat === 'cold_start') return `${benchPath}_cold_start_ms`
  return `${benchPath}_${stat}_ms`
}

function displayLabel(benchPath: BenchPath, stat: BenchStat): string {
  const section = PATH_SECTION[benchPath]
  if (stat === 'cold_start' || stat === 'req_per_sec') return section
  return `${section} ${stat}`
}

function getMetric(spec: MetricSpec): BenchmarkMetric {
  const id = spec.path.toUpperCase()
  const label = displayLabel(spec.path, spec.stat)
  return {
    ...spec,
    key: resultKey(spec.path, spec.stat),
    id,
    metric: VIOLATION_METRICS[spec.stat as keyof typeof VIOLATION_METRICS] ?? `${spec.stat}_ms`,
    label,
    reportLabel: `${id} ${label}`,
    valueFrom: samples => {
      if (spec.stat === 'p50' || spec.stat === 'p99') {
        return (samples[spec.path] as LatencySample)[spec.stat]
      }
      return samples[spec.path] as number
    }
  }
}

const METRICS = METRIC_SPECS.map(getMetric)
const THRESHOLDS = Object.fromEntries(METRICS.map(m => [m.key, m.limit])) as Record<string, number>

function latestPath(): string {
  return path.join(GENERATED_ROOT, LATEST_JSON)
}

function formatRunLabel({ git_sha, timestamp }: Pick<BenchmarkResult, 'git_sha' | 'timestamp'>): string {
  return `${git_sha.slice(0, GIT_SHA_SHORT)} (${timestamp.slice(0, DATE_SHORT)})`
}

function percentile(samples: number[], quantile: number): number {
  const last = samples.length - 1
  return samples[Math.floor(last * quantile)] ?? samples.at(-1) ?? 0
}

function postJson(baseUrl: string, endpoint: string, body: string | object): Promise<Response> {
  return fetch(`${baseUrl}/api/${endpoint}`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: typeof body === 'string' ? body : JSON.stringify(body)
  })
}

async function readJsonAt(filePath: string): Promise<BenchmarkResult | null> {
  const file = Bun.file(filePath)
  if (!(await file.exists())) return null
  return (await file.json()) as BenchmarkResult
}

async function requireJsonAt(filePath: string, missingMessage: string): Promise<BenchmarkResult> {
  const result = await readJsonAt(filePath)
  if (!result) {
    console.error(missingMessage)
    process.exit(1)
  }
  return result
}

async function measure(baseUrl: string, endpoint: string, body: object, n = DEFAULT_SAMPLE_COUNT) {
  const samples: number[] = []
  const payload = JSON.stringify(body)
  for (let i = 0; i < n; i++) {
    const t = performance.now()
    const r = await postJson(baseUrl, endpoint, payload)
    if (r.ok) samples.push(performance.now() - t)
  }
  if (samples.length === 0) throw new Error(`All requests to /api/${endpoint} failed`)
  samples.sort((a, b) => a - b)
  return {
    p50: percentile(samples, P50_QUANTILE),
    p99: percentile(samples, P99_QUANTILE)
  }
}

async function measureThroughput(
  baseUrl: string,
  endpoint: string,
  body: object,
  durationMs = THROUGHPUT_DURATION_MS,
  concurrency = THROUGHPUT_CONCURRENCY
) {
  const until = performance.now() + durationMs
  let completed = 0
  const payload = JSON.stringify(body)
  async function worker(): Promise<void> {
    async function step(): Promise<void> {
      if (performance.now() >= until) return
      try {
        const r = await postJson(baseUrl, endpoint, payload)
        if (r.ok) completed += 1
      } catch {
        // ignore transient network errors during throughput window
      }
      return step()
    }
    await step()
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()))
  return completed / (durationMs / MS_PER_SECOND)
}

async function waitForServer(baseUrl: string, srv: ReturnType<typeof Bun.spawn>): Promise<void> {
  let exited = false
  srv.exited.then(() => {
    exited = true
  })
  for (let i = 0; i < READINESS_POLL_MAX; i++) {
    if (exited) throw new Error('Preview server exited before readiness')
    try {
      const r = await fetch(baseUrl)
      if (r.ok) return
    } catch {
      // connection refused until preview server is ready
    }
    await Bun.sleep(READINESS_POLL_MS)
  }
  throw new Error('Preview server did not start in 90 s')
}

function collectViolations(samples: BenchSamples): BenchmarkResult['violations'] {
  return METRICS.reduce<BenchmarkResult['violations']>((violations, m) => {
    const value = m.valueFrom(samples)
    const failed = m.kind === 'max' ? value > m.limit : value < m.limit
    if (failed) {
      violations.push({
        path: m.id,
        metric: m.metric,
        value: +value.toFixed(1),
        threshold: m.limit,
        delta: +(m.kind === 'max' ? value - m.limit : m.limit - value).toFixed(1)
      })
    }
    return violations
  }, [])
}

async function writeResultArtifacts(result: BenchmarkResult, runDir: string): Promise<void> {
  const json = JSON.stringify(result, null, 2)
  await mkdir(runDir, { recursive: true })
  await Bun.write(path.join(runDir, 'result.json'), json)
  await Bun.write(latestPath(), json)
}

function printPerformanceReport(result: BenchmarkResult, violations: BenchmarkResult['violations'], runDir: string) {
  console.log('\nPerformance Report')
  for (const m of METRICS) {
    console.log(`${m.reportLabel}  ${result.results[m.key]} ${m.unit}`)
  }
  console.log(`${result.summary} ${violations.length} violation(s) -> ${runDir}`)
  console.log(`latest.json -> ${latestPath()}`)
}

async function main(): Promise<void> {
  const action = process.env.usage_cmd
  const port = Number.parseInt(process.env.usage_port ?? '3457', 10)

  if (!Number.isFinite(port) || port <= 0) {
    console.error('perf: --port must be a positive integer')
    process.exit(1)
  }

  const actions = {
    run: async () => {
      const baseUrl = `http://localhost:${port}`
      const gitSha = spawnText(['git', '-C', ROOT, 'rev-parse', 'HEAD'])
      const timestamp = new Date().toISOString()
      console.log('P1  cold start...')
      const t0 = performance.now()
      const srv = Bun.spawn(['bun', SERVER], {
        cwd: ROOT,
        env: { ...process.env, PORT: String(port) },
        stdout: 'ignore',
        stderr: 'inherit'
      })
      try {
        await waitForServer(baseUrl, srv)
        const p1 = performance.now() - t0
        console.log(`P1  ${p1.toFixed(0)} ms`)

        console.log('P2  FTS search (100 samples)...')
        const p2 = await measure(baseUrl, 'list', { query: 'bun', limit: 50 })
        console.log(`P2  p50=${p2.p50.toFixed(1)} ms  p99=${p2.p99.toFixed(1)} ms`)

        console.log('P3  filter query (100 samples)...')
        const p3 = await measure(baseUrl, 'list', { types: ['task'], limit: 50 })
        console.log(`P3  p50=${p3.p50.toFixed(1)} ms  p99=${p3.p99.toFixed(1)} ms`)

        console.log('P4  throughput 10 s...')
        const p4 = await measureThroughput(baseUrl, 'list', { query: 'bun', limit: 50 })
        console.log(`P4  ${p4.toFixed(0)} req/s`)

        console.log('P5  getStats (100 samples)...')
        const p5 = await measure(baseUrl, 'getStats', {})
        console.log(`P5  p50=${p5.p50.toFixed(1)} ms  p99=${p5.p99.toFixed(1)} ms`)

        const sample = { p1, p2, p3, p4, p5 }
        const violations = collectViolations(sample)
        const runDir = path.join(RUNS_DIR, isoSlug(timestamp))
        const result: BenchmarkResult = {
          timestamp,
          git_sha: gitSha,
          bun_version: Bun.version,
          thresholds: THRESHOLDS,
          results: Object.fromEntries(METRICS.map(m => [m.key, +m.valueFrom(sample).toFixed(m.precision)])),
          violations,
          summary: violations.length === 0 ? 'PASS' : 'FAIL'
        }
        await writeResultArtifacts(result, runDir)
        printPerformanceReport(result, violations, runDir)
        process.exit(violations.length > 0 ? 1 : 0)
      } finally {
        srv.kill()
      }
    },
    compare: async () => {
      const [base, latest] = await Promise.all([
        requireJsonAt(BASELINE_PATH, 'No baseline.json - run `mise run perf baseline` first'),
        requireJsonAt(latestPath(), 'No latest.json - run `mise run perf run` first')
      ])
      console.log(`Baseline : ${formatRunLabel(base)}`)
      console.log(`Latest   : ${formatRunLabel(latest)}`)
      let regressions = 0
      for (const m of METRICS) {
        const b = base.results[m.key]
        const l = latest.results[m.key]
        const delta = (l ?? 0) - (b ?? 0)
        const pct = (b ?? 0) === 0 ? 0 : (delta / (b ?? 0)) * 100
        const regressed =
          m.compareDir === 'lower'
            ? (l ?? 0) > (b ?? 0) && (l ?? 0) - (b ?? 0) >= Math.max(0.25, (b ?? 0) * 0.2)
            : pct < -20
        if (regressed) regressions++
        const status = regressed ? 'REGRESSION' : Math.abs(pct) < 5 ? 'stable' : delta > 0 ? 'worse' : 'better'
        console.log(`${m.id} ${m.label}: ${b} -> ${l} (${delta >= 0 ? '+' : ''}${delta.toFixed(1)}${m.unit}) ${status}`)
      }
      console.log(`${regressions} regression(s)`)
      process.exit(regressions > 0 ? 1 : 0)
    },
    baseline: async () => {
      const latest = await requireJsonAt(latestPath(), 'No latest.json - run `mise run perf run` first')
      await mkdir(path.dirname(BASELINE_PATH), { recursive: true })
      await Bun.write(BASELINE_PATH, Bun.file(latestPath()))
      console.log(`Baseline set -> ${formatRunLabel(latest)} (${BASELINE_PATH})`)
    },
    open: async () => {
      const { timestamp } = await requireJsonAt(latestPath(), 'No latest.json - run `mise run perf run` first')
      const child = Bun.spawnSync(['open', path.join(RUNS_DIR, isoSlug(timestamp))])
      process.exit(child.exitCode ?? 0)
    },
    'workflow-observability': () => {
      const child = Bun.spawnSync(
        [
          'bun',
          path.join(ROOT, 'tools/metrics/harnesses/perf/workflow_observability_perf.script.ts'),
          ...workflowObservabilityArgs()
        ],
        { cwd: ROOT, stdio: ['ignore', 'inherit', 'inherit'] }
      )
      process.exit(child.exitCode ?? 0)
    },
    'workflow-observability extract-dataset': () => {
      const args: string[] = []
      if (process.env.usage_feature) args.push('--feature', process.env.usage_feature)
      if (process.env.usage_output) args.push('--output', process.env.usage_output)
      const child = Bun.spawnSync(
        [
          'bun',
          path.join(ROOT, 'tools/metrics/harnesses/perf/workflow_observability_extract_dataset.script.ts'),
          ...args
        ],
        { cwd: ROOT, stdio: ['ignore', 'inherit', 'inherit'] }
      )
      process.exit(child.exitCode ?? 0)
    }
  } as const

  const fn = actions[action as keyof typeof actions]
  if (!fn) {
    console.error(
      'Usage: mise run perf <run|baseline|compare|open|workflow-observability|workflow-observability extract-dataset>'
    )
    process.exit(1)
  }
  await fn()
}

if (import.meta.main) {
  await main()
}
