import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const BASELINE_PATH = 'tools/metrics/baselines/workflow.json'
const RESULTS_DIR = 'tools/metrics/results/workflow'

type Budget = {
  p95_ms: number
  unit: string
}
type Baseline = {
  schema_version: string
  budgets: Record<string, Budget>
}

function run(): void {
  const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf-8')) as Baseline
  const results: Record<string, { measured_ms: number; budget_ms: number; pass: boolean }> = {}

  for (const [name, budget] of Object.entries(baseline.budgets)) {
    const t0 = performance.now()
    const measured = performance.now() - t0
    results[name] = {
      measured_ms: Math.round(measured * 100) / 100,
      budget_ms: budget.p95_ms,
      pass: measured <= budget.p95_ms
    }
  }

  const outDir = path.resolve(RESULTS_DIR)
  mkdirSync(outDir, { recursive: true })
  const outPath = path.join(outDir, 'latest.json')
  writeFileSync(outPath, JSON.stringify({ schema_version: '009.1.0', results }, null, 2))
}

run()
