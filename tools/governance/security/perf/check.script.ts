#!/usr/bin/env bun
import path from 'node:path'

type Scope = 'secrets' | 'dependencies-noop' | 'handoff-scrub'

type Baseline = {
  policy: {
    regression_pct: number
    regression_min_delta_ms: number
    absolute_p95_ms: Record<Scope, number>
  }
  results: Record<Scope, { p95: number | null }>
}

const ROOT = process.cwd()
const BASELINE_PATH = path.join(ROOT, 'tools/metrics/baselines/perf/security.json')

const RUNNERS: Record<Scope, string> = {
  secrets: path.join(ROOT, 'tools/governance/security/perf/secrets_perf.script.ts'),
  'dependencies-noop': path.join(ROOT, 'tools/governance/security/perf/dependencies_perf.script.ts'),
  'handoff-scrub': path.join(ROOT, 'tools/governance/security/perf/handoff_scrub_perf.script.ts')
}

async function readBaseline(): Promise<Baseline> {
  const parsed = JSON.parse(await Bun.file(BASELINE_PATH).text()) as Baseline
  const requireFinite = (value: unknown, label: string): number => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new Error(`invalid ${label} in ${BASELINE_PATH}`)
    }
    return value
  }
  if (!parsed?.policy?.absolute_p95_ms) throw new Error(`invalid baseline policy in ${BASELINE_PATH}`)
  requireFinite(parsed.policy.regression_pct, 'policy.regression_pct')
  requireFinite(parsed.policy.regression_min_delta_ms, 'policy.regression_min_delta_ms')
  for (const scope of ['secrets', 'dependencies-noop', 'handoff-scrub'] as const) {
    requireFinite(parsed.policy.absolute_p95_ms[scope], `policy.absolute_p95_ms.${scope}`)
    const baselineP95 = parsed.results?.[scope]?.p95
    if (baselineP95 !== null && baselineP95 !== undefined) {
      requireFinite(baselineP95, `results.${scope}.p95`)
    }
  }
  return parsed
}

function runScope(scope: Scope): number {
  const script = RUNNERS[scope]
  const run = Bun.spawnSync(['bun', script], { cwd: ROOT, stdout: 'pipe', stderr: 'pipe' })
  if (run.exitCode !== 0) {
    const stderr = new TextDecoder().decode(run.stderr).trim()
    throw new Error(`${scope} perf harness failed: ${stderr || `exit ${run.exitCode}`}`)
  }
  const stdout = new TextDecoder().decode(run.stdout).trim()
  const payload = JSON.parse(stdout) as { p95Ms?: number }
  if (typeof payload.p95Ms !== 'number' || !Number.isFinite(payload.p95Ms)) {
    throw new Error(`${scope} perf harness returned invalid payload: ${stdout}`)
  }
  return payload.p95Ms
}

async function main(): Promise<number> {
  const baseline = await readBaseline()
  const scopes: Scope[] = ['secrets', 'dependencies-noop', 'handoff-scrub']

  let violations = 0
  for (const scope of scopes) {
    const currentP95 = runScope(scope)
    const baselineP95 = baseline.results?.[scope]?.p95
    const absoluteLimit = baseline.policy.absolute_p95_ms[scope]

    const absoluteFail = currentP95 > absoluteLimit

    let regressionFail = false
    if (typeof baselineP95 === 'number') {
      const delta = currentP95 - baselineP95
      const pct = baselineP95 === 0 ? (currentP95 === 0 ? 0 : Number.POSITIVE_INFINITY) : (delta / baselineP95) * 100
      regressionFail = delta >= baseline.policy.regression_min_delta_ms && pct >= baseline.policy.regression_pct
    }

    const ok = !absoluteFail && !regressionFail
    if (!ok) violations += 1

    console.log(
      `[security-perf] ${scope}: p95=${currentP95.toFixed(3)}ms abs<=${absoluteLimit} ` +
        `baseline=${baselineP95 ?? 'n/a'} status=${ok ? 'OK' : 'FAIL'}`
    )
  }

  if (violations > 0) {
    console.error(`[security-perf] ${violations} scope(s) violated policy`) // surfaced in CI logs
    return 1
  }

  console.log('[security-perf] all scopes within policy')
  return 0
}

if (import.meta.main) process.exit(await main())
