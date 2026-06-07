/** Pure policy + regression helpers for workflow observability perf harness. */

export const DEFAULT_WARMUP = 10
export const DEFAULT_ITERATIONS = 100
export const DEFAULT_REGRESSION_PCT = 20
export const DEFAULT_REGRESSION_MIN_DELTA_MS = 0.25

export const DEFAULT_ABSOLUTE_P95_MS: Record<string, number> = {
  'handoff-generate': 250,
  'next-populated': 100,
  'next-early-exit': 50
}

export type WorkflowObservabilityPolicy = {
  warmup: number
  iterations: number
  regressionPct: number
  regressionMinDeltaMs: number
  compareRegression: boolean
  checkAbsoluteLimits: boolean
  absoluteP95Ms: Record<string, number>
}

export type WorkflowObservabilityBaselineFile = {
  policy?: Partial<{
    warmup: number
    iterations: number
    regression_pct: number
    regression_min_delta_ms: number
    compare_regression: boolean
    check_absolute_limits: boolean
    absolute_p95_ms: Record<string, number>
  }>
  results?: Record<string, { p50: number; p95: number; p99: number }>
}

export function defaultPolicy(): WorkflowObservabilityPolicy {
  return {
    warmup: DEFAULT_WARMUP,
    iterations: DEFAULT_ITERATIONS,
    regressionPct: DEFAULT_REGRESSION_PCT,
    regressionMinDeltaMs: DEFAULT_REGRESSION_MIN_DELTA_MS,
    compareRegression: true,
    checkAbsoluteLimits: true,
    absoluteP95Ms: { ...DEFAULT_ABSOLUTE_P95_MS }
  }
}

export function policyFromBaselineFile(
  file: WorkflowObservabilityBaselineFile | undefined
): WorkflowObservabilityPolicy {
  const base = defaultPolicy()
  const p = file?.policy
  if (!p) return base
  return {
    warmup: p.warmup ?? base.warmup,
    iterations: p.iterations ?? base.iterations,
    regressionPct: p.regression_pct ?? base.regressionPct,
    regressionMinDeltaMs: p.regression_min_delta_ms ?? base.regressionMinDeltaMs,
    compareRegression: p.compare_regression ?? base.compareRegression,
    checkAbsoluteLimits: p.check_absolute_limits ?? base.checkAbsoluteLimits,
    absoluteP95Ms: { ...base.absoluteP95Ms, ...p.absolute_p95_ms }
  }
}

export function parseWorkflowObservabilityArgv(argv: string[]): WorkflowObservabilityPolicy {
  const policy = defaultPolicy()
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === undefined) break
    const next = argv[i + 1]
    switch (arg) {
      case '--regression-pct':
        policy.regressionPct = Number(next)
        i++
        break
      case '--regression-min-delta-ms':
        policy.regressionMinDeltaMs = Number(next)
        i++
        break
      case '--warmup':
        policy.warmup = Number(next)
        i++
        break
      case '--iterations':
        policy.iterations = Number(next)
        i++
        break
      case '--absolute-p95-ms': {
        const [label, limit] = (next ?? '').split('=')
        if (label && limit) policy.absoluteP95Ms[label] = Number(limit)
        i++
        break
      }
      case '--no-regression':
        policy.compareRegression = false
        break
      case '--no-absolute-limits':
        policy.checkAbsoluteLimits = false
        break
      case '--help':
        printUsage()
        process.exit(0)
        break
      default:
        if (arg.startsWith('-')) {
          console.error(`workflow observability perf: unknown flag ${arg}`)
          printUsage()
          process.exit(2)
        }
    }
  }
  return policy
}

export function mergePolicy(
  baseline: WorkflowObservabilityPolicy,
  cli: WorkflowObservabilityPolicy
): WorkflowObservabilityPolicy {
  return {
    ...baseline,
    ...cli,
    absoluteP95Ms: { ...baseline.absoluteP95Ms, ...cli.absoluteP95Ms }
  }
}

/** Match preview-server perf: require absolute delta >= max(minDelta, baseline * pct/100). */
export function regressionThresholdMs(baselineP95: number, policy: WorkflowObservabilityPolicy): number {
  return Math.max(policy.regressionMinDeltaMs, baselineP95 * (policy.regressionPct / 100))
}

export function isRegression(baselineP95: number, currentP95: number, policy: WorkflowObservabilityPolicy): boolean {
  if (currentP95 <= baselineP95) return false
  const delta = currentP95 - baselineP95
  return delta >= regressionThresholdMs(baselineP95, policy)
}

export function formatRegressionMessage(
  label: string,
  baselineP95: number,
  currentP95: number,
  policy: WorkflowObservabilityPolicy
): string {
  const delta = currentP95 - baselineP95
  const pct = baselineP95 <= 0 ? 0 : (delta / baselineP95) * 100
  const threshold = regressionThresholdMs(baselineP95, policy)
  return (
    `REGRESSION: ${label} p95 ${baselineP95.toFixed(2)}ms → ${currentP95.toFixed(2)}ms ` +
    `(+${pct.toFixed(1)}%, delta ${delta.toFixed(2)}ms, threshold ${threshold.toFixed(2)}ms)`
  )
}

function printUsage(): void {
  console.log(`usage: workflow-observability perf [options]

Options:
  --regression-pct <n>           Min % of baseline p95 for delta floor (default ${DEFAULT_REGRESSION_PCT})
  --regression-min-delta-ms <n>  Min absolute p95 delta in ms (default ${DEFAULT_REGRESSION_MIN_DELTA_MS})
  --warmup <n>                   Warmup iterations (default ${DEFAULT_WARMUP})
  --iterations <n>               Sample count (default ${DEFAULT_ITERATIONS})
  --absolute-p95-ms <label=ms>   Override WOBS absolute p95 cap (repeatable)
  --no-regression                Skip baseline comparison; still writes baseline JSON
  --no-absolute-limits           Skip WOBS absolute p95 caps
  --help                         Show this help

Regression uses max(--regression-min-delta-ms, baseline_p95 * --regression-pct / 100)
so sub-ms timings do not flake on cross-runner noise.`)
}
