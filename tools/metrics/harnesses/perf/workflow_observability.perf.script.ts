#!/usr/bin/env bun
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { chdirToRepoRoot } from '../../../support/lib/shared/repo_root.script.ts'
import {
  formatRegressionMessage,
  isRegression,
  mergePolicy,
  parseWorkflowObservabilityArgv,
  policyFromBaselineFile,
  type WorkflowObservabilityBaselineFile,
  type WorkflowObservabilityPolicy
} from './workflow_observability_perf_core.script.ts'

const ROOT = chdirToRepoRoot()
const POPULATED_DATASET_PATH = path.join(ROOT, 'tools/metrics/fixtures/perf/workflow-observability-feature.json')
const POPULATED_DIR = path.join(ROOT, 'tmp/perf-fixture/workflow-observability-populated')
const POPULATED_DIR_REL = path.relative(ROOT, POPULATED_DIR)
const FIXTURE_SLUG = 'wobs'
const EARLY_EXIT_DIR = path.join(ROOT, `tmp/perf-fixture/005-${FIXTURE_SLUG}`)
const EARLY_EXIT_DIR_REL = path.relative(ROOT, EARLY_EXIT_DIR)
const HANDOFFS_DIR = path.join(ROOT, 'tmp/handoffs')
const GHERKIN_FILE = path.join(HANDOFFS_DIR, `opencode-${FIXTURE_SLUG}-gherkin.md`)
const BASELINE_PATH = path.join(ROOT, 'tools/metrics/baselines/perf/workflow-observability.json')

type PerfFeatureDataset = {
  slug: string
  files: {
    spec_md: string
    plan_md: string
    tasks_md: string
    handoff_md: string
  }
  checklist_files: string[]
  handoff_emitted_gherkin: boolean
}

const ABSOLUTE_PATH_RE = /\/(Users|home|etc|var)\/[A-Za-z0-9_./-]+/g

function sanitizeScrubSensitiveText(content: string): string {
  return content.replace(ABSOLUTE_PATH_RE, '<abs-path>')
}

function loadDataset(): PerfFeatureDataset {
  return JSON.parse(readFileSync(POPULATED_DATASET_PATH, 'utf-8')) as PerfFeatureDataset
}

function handoffMarkerPath(slug: string): string {
  return path.join(HANDOFFS_DIR, `opencode-${slug}-gherkin.md`)
}

function createPopulatedFixture(dataset: PerfFeatureDataset): void {
  mkdirSync(path.join(POPULATED_DIR, 'checklists'), { recursive: true })
  writeFileSync(path.join(POPULATED_DIR, 'spec.md'), sanitizeScrubSensitiveText(dataset.files.spec_md))
  writeFileSync(path.join(POPULATED_DIR, 'plan.md'), sanitizeScrubSensitiveText(dataset.files.plan_md))
  writeFileSync(path.join(POPULATED_DIR, 'tasks.md'), sanitizeScrubSensitiveText(dataset.files.tasks_md))
  writeFileSync(path.join(POPULATED_DIR, 'handoff.md'), sanitizeScrubSensitiveText(dataset.files.handoff_md))
  for (const fileName of dataset.checklist_files) {
    writeFileSync(path.join(POPULATED_DIR, 'checklists', fileName), '')
  }
  mkdirSync(HANDOFFS_DIR, { recursive: true })
  if (dataset.handoff_emitted_gherkin) {
    writeFileSync(handoffMarkerPath(dataset.slug), '# gherkin fixture')
  }
}

function cleanupPopulatedFixture(dataset: PerfFeatureDataset): void {
  rmSync(POPULATED_DIR, { recursive: true, force: true })
  const marker = handoffMarkerPath(dataset.slug)
  if (existsSync(marker)) rmSync(marker)
}

function createFixture(): void {
  mkdirSync(path.join(EARLY_EXIT_DIR, 'checklists'), { recursive: true })
  writeFileSync(path.join(EARLY_EXIT_DIR, 'spec.md'), '# wobs spec')
  writeFileSync(path.join(EARLY_EXIT_DIR, 'plan.md'), '# wobs plan')
  writeFileSync(path.join(EARLY_EXIT_DIR, 'tasks.md'), '# wobs tasks')
  writeFileSync(path.join(EARLY_EXIT_DIR, 'handoff.md'), '# wobs handoff\n\n## AC Tracker\n')
  writeFileSync(path.join(EARLY_EXIT_DIR, 'checklists', 'analyze-plan.md'), '')
  writeFileSync(path.join(EARLY_EXIT_DIR, 'checklists', 'analyze-tasks.md'), '')
  writeFileSync(path.join(EARLY_EXIT_DIR, 'checklists', 'implement-done.md'), '')
  mkdirSync(HANDOFFS_DIR, { recursive: true })
  writeFileSync(GHERKIN_FILE, '# gherkin fixture')
}

function cleanupFixture(): void {
  rmSync(EARLY_EXIT_DIR, { recursive: true, force: true })
  if (existsSync(GHERKIN_FILE)) rmSync(GHERKIN_FILE)
}

export function percentile(sorted: number[], p: number): number {
  const idx = Math.min(Math.floor((sorted.length * p) / 100), sorted.length - 1)
  return sorted[idx] ?? 0
}

function suppressStdout<T>(fn: () => T): T {
  const origLog = console.log
  const origWrite = process.stdout.write
  console.log = () => {}
  process.stdout.write = (_data: unknown, ..._args: unknown[]) => true
  try {
    return fn()
  } finally {
    console.log = origLog
    process.stdout.write = origWrite
  }
}

function bench(label: string, fn: () => number, samples: number[], policy: WorkflowObservabilityPolicy): void {
  for (let i = 0; i < policy.warmup; i++) {
    const exitCode = suppressStdout(fn)
    if (exitCode !== 0) throw new Error(`${label}: warmup exit code ${exitCode}`)
  }
  for (let i = 0; i < policy.iterations; i++) {
    const t0 = performance.now()
    const exitCode = suppressStdout(fn)
    if (exitCode !== 0) throw new Error(`${label}: exit code ${exitCode}`)
    samples.push(performance.now() - t0)
  }
}

function loadExistingBaseline(): WorkflowObservabilityBaselineFile | undefined {
  if (!existsSync(BASELINE_PATH)) return
  return JSON.parse(readFileSync(BASELINE_PATH, 'utf-8')) as WorkflowObservabilityBaselineFile
}

function resolvePolicy(argv: string[]): WorkflowObservabilityPolicy {
  const cli = parseWorkflowObservabilityArgv(argv)
  const fromFile = policyFromBaselineFile(loadExistingBaseline())
  return mergePolicy(fromFile, cli)
}

export function evaluateResults(
  results: Record<string, number[]>,
  policy: WorkflowObservabilityPolicy,
  existing: WorkflowObservabilityBaselineFile | undefined
): {
  hasFailure: boolean
  stats: Record<string, { p50: number; p95: number; p99: number }>
  failures: string[]
} {
  const stats: Record<string, { p50: number; p95: number; p99: number }> = {}
  const failures: string[] = []

  for (const [label, samples] of Object.entries(results)) {
    const sorted = [...samples].sort((a, b) => a - b)
    const p50 = percentile(sorted, 50)
    const p95 = percentile(sorted, 95)
    const p99 = percentile(sorted, 99)
    stats[label] = { p50, p95, p99 }

    if (policy.checkAbsoluteLimits) {
      const cap = policy.absoluteP95Ms[label]
      if (cap !== undefined && p95 > cap) {
        failures.push(`LIMIT: ${label} p95 ${p95.toFixed(2)}ms exceeds cap ${cap}ms (WOBS)`)
      }
    }

    if (policy.compareRegression && existing?.results?.[label]) {
      const baselineP95 = existing.results[label].p95
      if (isRegression(baselineP95, p95, policy)) {
        failures.push(formatRegressionMessage(label, baselineP95, p95, policy))
      }
    }
  }

  return { hasFailure: failures.length > 0, stats, failures }
}

async function main(): Promise<void> {
  const policy = resolvePolicy(process.argv.slice(2))
  const existing = loadExistingBaseline()
  const dataset = loadDataset()

  const { run: runGenerate } = await import('../../../governance/specs/workflow/handoff_generate.script.ts')
  const { run: runOrchestrate } = await import('../../../governance/specs/workflow/orchestrated_handoff.script.ts')

  const results: Record<string, number[]> = {}

  createPopulatedFixture(dataset)
  createFixture()
  try {
    const hgSamples: number[] = []
    bench('handoff-generate', () => runGenerate(['--feature', POPULATED_DIR_REL]), hgSamples, policy)
    results['handoff-generate'] = hgSamples

    const nextPopSamples: number[] = []
    bench(
      '--next (populated)',
      () => runOrchestrate(['orchestrated-handoff', '--feature', POPULATED_DIR_REL, '--next']),
      nextPopSamples,
      policy
    )
    results['next-populated'] = nextPopSamples

    const nextEarlySamples: number[] = []
    bench(
      '--next (early-exit)',
      () => runOrchestrate(['orchestrated-handoff', '--feature', EARLY_EXIT_DIR_REL, '--next']),
      nextEarlySamples,
      policy
    )
    results['next-early-exit'] = nextEarlySamples
  } finally {
    cleanupPopulatedFixture(dataset)
    cleanupFixture()
  }

  console.log('\nWorkflow Observability Performance')
  console.log('='.repeat(50))
  console.log(`warmup: ${policy.warmup}  samples: ${policy.iterations}`)
  if (policy.compareRegression) {
    console.log(`regression: max(${policy.regressionMinDeltaMs}ms, baseline_p95 * ${policy.regressionPct}%)`)
  } else {
    console.log('regression: disabled')
  }

  const { hasFailure, stats, failures } = evaluateResults(results, policy, existing)
  for (const [label, { p50, p95, p99 }] of Object.entries(stats)) {
    console.log(`${label}`)
    console.log(`  p50=${p50.toFixed(2)}ms  p95=${p95.toFixed(2)}ms  p99=${p99.toFixed(2)}ms`)
  }
  for (const line of failures) {
    console.error(line)
  }

  const baselinePayload: WorkflowObservabilityBaselineFile & {
    timestamp: string
    git_sha: string
    bun_version: string
    warmup: number
    iterations: number
  } = {
    timestamp: new Date().toISOString(),
    git_sha: (await Bun.$`git rev-parse HEAD`.text()).trim(),
    bun_version: Bun.version,
    warmup: policy.warmup,
    iterations: policy.iterations,
    policy: {
      regression_pct: policy.regressionPct,
      regression_min_delta_ms: policy.regressionMinDeltaMs,
      compare_regression: policy.compareRegression,
      check_absolute_limits: policy.checkAbsoluteLimits,
      absolute_p95_ms: policy.absoluteP95Ms
    },
    results: stats
  }
  writeFileSync(BASELINE_PATH, `${JSON.stringify(baselinePayload, null, 2)}\n`, 'utf-8')
  console.log(`\nBaseline written to ${BASELINE_PATH}`)

  if (hasFailure) process.exit(1)
}

if (import.meta.main) {
  await main()
}
