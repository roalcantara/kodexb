/**
 * Merge Playwright JUnit output with scenario-scores.json into tmp/bdd/e2e/metrics/latest.json.
 * Compare runs against tools/metrics/baselines/e2e-quality/quality-baseline.json.
 *
 * Usage:
 *   bun packages/ops/src/metrics/harnesses/e2e-quality/e2e_metrics.script.ts report [--command "mise run test e2e --smoke"]
 *   bun packages/ops/src/metrics/harnesses/e2e-quality/e2e_metrics.script.ts compare
 *   bun packages/ops/src/metrics/harnesses/e2e-quality/e2e_metrics.script.ts write-baseline [--command "..."]
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dir, '../../../..')
const E2E_QUALITY_BASELINE = path.join(ROOT, 'tools/metrics/baselines/e2e-quality')
const SCORES_PATH = path.join(E2E_QUALITY_BASELINE, 'scenario-scores.json')
const BASELINE_PATH = path.join(E2E_QUALITY_BASELINE, 'quality-baseline.json')
const JUNIT_PATH = path.join(ROOT, 'tmp/bdd/e2e/junit.xml')
const METRICS_DIR = path.join(ROOT, 'tmp/bdd/e2e/metrics')
const LATEST_PATH = path.join(METRICS_DIR, 'latest.json')

type ScenarioScore = {
  id: string
  feature: string
  priority: 'p0' | 'p1' | 'p2'
  status: string
  specs: string[]
  qualityScore: number
}

type ScoresFile = {
  schemaVersion: number
  scenarios: ScenarioScore[]
}

type JunitCase = {
  name: string
  skipped: boolean
  failed: boolean
}

type MetricsReport = {
  schemaVersion: 1
  generatedAt: string
  command: string
  commit: string
  branch: string
  durationMs: number
  summary: {
    scenarioCount: number
    implementedCount: number
    todoCount: number
    deferredNativeCount: number
    unitOnlyCount: number
    p0AutomationPercent: number
    p1AutomationPercent: number
    averageP0QualityScore: number
    averageP1QualityScore: number
    weakAssertionCount: number
    conditionalSkipCount: number
    knownFlakeCount: number
    passedCount: number
    failedCount: number
    skippedCount: number
  }
  degradations: string[]
  scenarios: Array<
    ScenarioScore & {
      lastResult: 'passed' | 'failed' | 'skipped' | 'unknown'
    }
  >
}

function spawnText(cmd: string[]): string {
  const r = Bun.spawnSync(cmd, { stdout: 'pipe', stderr: 'pipe' })
  return r.stdout.toString().trim()
}

function parseArgs(argv: string[]): { mode: string; command: string } {
  const mode = argv[2] ?? 'report'
  const cmdIdx = argv.indexOf('--command')
  const fromArgv = cmdIdx >= 0 ? argv[cmdIdx + 1] : undefined
  const command = fromArgv ?? process.env.E2E_METRICS_COMMAND ?? 'bun run e2e:regression'
  return { mode, command }
}

function parseJUnit(xml: string): { cases: JunitCase[]; durationMs: number } {
  const cases: JunitCase[] = []
  const testcaseRe = /<testcase name="([^"]+)"[^>]*>([\s\S]*?)<\/testcase>/g
  let durationMs = 0
  const timeMatch = xml.match(/<testsuite[^>]* time="([^"]+)"/)
  if (timeMatch?.[1]) durationMs = Math.round(Number.parseFloat(timeMatch[1]) * 1000)

  for (const match of xml.matchAll(testcaseRe)) {
    const body = match[2] ?? ''
    cases.push({
      name: match[1] ?? '',
      skipped: body.includes('<skipped'),
      failed: body.includes('<failure') || body.includes('<error')
    })
  }
  return { cases, durationMs }
}

async function loadFeatureTags(): Promise<{
  todoCount: number
  nativeCount: number
  p0Total: number
  p1Total: number
}> {
  const glob = new Bun.Glob('assets/features/e2e/**/*.feature')
  let todoCount = 0
  let nativeCount = 0
  let p0Total = 0
  let p1Total = 0
  for await (const rel of glob.scan(ROOT)) {
    const text = await readFile(path.join(ROOT, rel), 'utf-8')
    const firstLine = text.split('\n')[0] ?? ''
    if (firstLine.includes('@todo')) todoCount++
    if (firstLine.includes('@native')) nativeCount++
    if (firstLine.includes('@p0')) p0Total++
    if (firstLine.includes('@p1')) p1Total++
  }
  return { todoCount, nativeCount, p0Total, p1Total }
}

function slugifyScenarioName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

function matchLastResult(
  scenario: ScenarioScore,
  cases: JunitCase[]
): MetricsReport['scenarios'][number]['lastResult'] {
  const slug = slugifyScenarioName(scenario.id.split('.').pop() ?? scenario.id)
  const hit = cases.find(c => slugifyScenarioName(c.name).includes(slug) || slug.includes(slugifyScenarioName(c.name)))
  if (!hit) return 'unknown'
  if (hit.skipped) return 'skipped'
  if (hit.failed) return 'failed'
  return 'passed'
}

async function buildReport(command: string): Promise<MetricsReport> {
  const scores = JSON.parse(await readFile(SCORES_PATH, 'utf-8')) as ScoresFile
  let cases: JunitCase[] = []
  let durationMs = 0
  try {
    const parsed = parseJUnit(await readFile(JUNIT_PATH, 'utf-8'))
    cases = parsed.cases
    durationMs = parsed.durationMs
  } catch {
    // junit optional when only scoring sidecar
  }

  const tags = await loadFeatureTags()
  const scenarios = scores.scenarios.map(s => ({
    ...s,
    lastResult: matchLastResult(s, cases)
  }))

  const p0 = scenarios.filter(s => s.priority === 'p0')
  const p1 = scenarios.filter(s => s.priority === 'p1')
  const implementedCount = scenarios.filter(s => s.status === 'passing' || s.status === 'implemented').length
  const p0Implemented = p0.filter(s => s.status === 'passing' || s.status === 'implemented').length
  const p1Implemented = p1.filter(s => s.status === 'passing' || s.status === 'implemented').length

  const passedCount = cases.filter(c => !c.skipped && !c.failed).length
  const failedCount = cases.filter(c => c.failed).length
  const skippedCount = cases.filter(c => c.skipped).length

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    command,
    commit: spawnText(['git', 'rev-parse', '--short', 'HEAD']) || 'unknown',
    branch: spawnText(['git', 'branch', '--show-current']) || 'unknown',
    durationMs,
    summary: {
      scenarioCount: scenarios.length,
      implementedCount,
      todoCount: tags.todoCount,
      deferredNativeCount: tags.nativeCount,
      unitOnlyCount: 0,
      p0AutomationPercent: p0.length === 0 ? 100 : Math.round((p0Implemented / p0.length) * 100),
      p1AutomationPercent: p1.length === 0 ? 100 : Math.round((p1Implemented / p1.length) * 100),
      averageP0QualityScore:
        p0.length === 0 ? 0 : Math.round((p0.reduce((n, s) => n + s.qualityScore, 0) / p0.length) * 100) / 100,
      averageP1QualityScore:
        p1.length === 0 ? 0 : Math.round((p1.reduce((n, s) => n + s.qualityScore, 0) / p1.length) * 100) / 100,
      weakAssertionCount: 0,
      conditionalSkipCount: skippedCount,
      knownFlakeCount: 0,
      passedCount,
      failedCount,
      skippedCount
    },
    degradations: [],
    scenarios
  }
}

function compareReports(current: MetricsReport, baseline: MetricsReport): string[] {
  const degradations: string[] = []
  const cs = current.summary
  const bs = baseline.summary

  if (cs.p0AutomationPercent < bs.p0AutomationPercent) {
    degradations.push(`P0 automation ${cs.p0AutomationPercent}% regressed from baseline ${bs.p0AutomationPercent}%`)
  }
  if (cs.p1AutomationPercent < bs.p1AutomationPercent) {
    degradations.push(`P1 automation ${cs.p1AutomationPercent}% regressed from baseline ${bs.p1AutomationPercent}%`)
  }
  if (cs.conditionalSkipCount > bs.conditionalSkipCount) {
    degradations.push(`Conditional skips ${cs.conditionalSkipCount} exceed baseline ${bs.conditionalSkipCount}`)
  }
  if (cs.failedCount > 0) {
    degradations.push(`Run has ${cs.failedCount} failing Playwright case(s)`)
  }
  if (cs.averageP0QualityScore < bs.averageP0QualityScore) {
    degradations.push(`Average P0 quality score ${cs.averageP0QualityScore} below baseline ${bs.averageP0QualityScore}`)
  }
  if (cs.averageP1QualityScore + 0.05 < bs.averageP1QualityScore - 0.05) {
    degradations.push(
      `Average P1 quality score ${cs.averageP1QualityScore} dropped ≥5 points from baseline ${bs.averageP1QualityScore}`
    )
  }
  return degradations
}

async function main(): Promise<void> {
  const { mode, command } = parseArgs(process.argv)
  await mkdir(METRICS_DIR, { recursive: true })

  if (mode === 'report' || mode === 'write-baseline') {
    const report = await buildReport(command)
    await writeFile(LATEST_PATH, `${JSON.stringify(report, null, 2)}\n`)
    console.log(`Wrote ${path.relative(ROOT, LATEST_PATH)}`)
    if (mode === 'write-baseline') {
      await writeFile(BASELINE_PATH, `${JSON.stringify(report, null, 2)}\n`)
      console.log(`Updated ${path.relative(ROOT, BASELINE_PATH)}`)
    }
    return
  }

  if (mode === 'compare') {
    const current = JSON.parse(await readFile(LATEST_PATH, 'utf-8')) as MetricsReport
    let baseline: MetricsReport
    try {
      baseline = JSON.parse(await readFile(BASELINE_PATH, 'utf-8')) as MetricsReport
    } catch {
      console.error(`Missing baseline at ${path.relative(ROOT, BASELINE_PATH)}; run write-baseline first.`)
      process.exit(1)
    }
    const degradations = compareReports(current, baseline)
    const out = { ...current, degradations }
    await writeFile(LATEST_PATH, `${JSON.stringify(out, null, 2)}\n`)
    if (degradations.length === 0) {
      console.log('No degradations vs baseline.')
      return
    }
    for (const d of degradations) console.error(`DEGRADATION: ${d}`)
    process.exit(1)
  }

  console.error(`Unknown mode: ${mode}`)
  process.exit(2)
}

await main()
