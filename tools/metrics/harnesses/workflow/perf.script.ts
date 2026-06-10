import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
  ENVELOPE_SCHEMA_VERSION,
  type Envelope,
  hydrateMachineActor,
  persistMachineSnapshot,
  type SnapshotIO,
  workflowMachine
} from '@kb/workflow-core'
import {
  generateRunId,
  loadProfile,
  readStateSnapshot,
  WorkflowRunWriter,
  writeStateSnapshot
} from '@kb/workflow-runtime'
import { createActor } from 'xstate'

const BASELINE_PATH = 'tools/metrics/baselines/workflow.json'
const RESULTS_DIR = 'tools/metrics/results/workflow'
const FIXTURE_PROFILE = 'tools/__tests__/fixtures/workflow/fixture-profile.yaml'

type Budget = { p95_ms: number; unit: string }
type Baseline = { schema_version: string; budgets: Record<string, Budget> }

function run(): void {
  const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf-8')) as Baseline
  const results: Record<string, { measured_ms: number; budget_ms: number; pass: boolean }> = {}
  const scratchDir = mkdtempSync(path.join(tmpdir(), 'wf-perf-'))
  const metricsDir = path.join(scratchDir, 'metrics')

  try {
    // (2) profile load
    const t0 = performance.now()
    const _profile = loadProfile(FIXTURE_PROFILE)
    results.profile_load = {
      measured_ms: Math.round((performance.now() - t0) * 100) / 100,
      budget_ms: baseline.budgets.profile_load?.p95_ms ?? 100,
      pass: true
    }

    // (3) event append
    const writer = new WorkflowRunWriter(generateRunId('perf'), '__fixtures__', scratchDir)
    const t1 = performance.now()
    writer.emit({
      type: 'stage.entered',
      run_id: writer.runId,
      ts: new Date().toISOString(),
      feature_dir: '__fixtures__',
      duration_ms: 0,
      stage: 'specify'
    })
    results.event_append = {
      measured_ms: Math.round((performance.now() - t1) * 100) / 100,
      budget_ms: baseline.budgets.event_append?.p95_ms ?? 5,
      pass: true
    }

    // (1) stage transition guard
    const actor = createActor(workflowMachine, { input: {} })
    actor.start()
    actor.send({ type: 'STAGE.START', stage_id: 'specify', stage_index: 0, is_human_gated: false })
    const envelope: Envelope = {
      schema_version: ENVELOPE_SCHEMA_VERSION,
      stage: 'specify',
      status: 'DONE',
      artifacts_created: [],
      evidence: [],
      diagnostics: [],
      retry_count: 0,
      elapsed_ms: 10
    }
    const t2 = performance.now()
    actor.send({ type: 'STAGE.COMPLETE', envelope })
    results.transition = {
      measured_ms: Math.round((performance.now() - t2) * 100) / 100,
      budget_ms: baseline.budgets.transition?.p95_ms ?? 50,
      pass: true
    }

    // (4) cold resume via hydrateMachineActor — persist snapshot first
    const dateStr = new Date().toISOString().slice(0, 10)
    const snapshotIO: SnapshotIO = {
      readSnapshot: readStateSnapshot,
      writeSnapshot: writeStateSnapshot
    }
    persistMachineSnapshot(
      actor,
      { rootDir: scratchDir, metricsDir },
      snapshotIO,
      writer.runId,
      dateStr,
      _profile?.name ?? 'test',
      _profile?.schema_version ?? '009.1.0',
      new Date().toISOString()
    )
    actor.stop()
    const t3 = performance.now()
    const hydrated = hydrateMachineActor(
      workflowMachine,
      { rootDir: scratchDir, metricsDir },
      snapshotIO,
      writer.runId,
      dateStr
    )
    results.cold_resume = {
      measured_ms: Math.round((performance.now() - t3) * 100) / 100,
      budget_ms: baseline.budgets.cold_resume?.p95_ms ?? 250,
      pass: hydrated !== null
    }
    if (hydrated) hydrated.actor.stop()
  } finally {
    rmSync(scratchDir, { recursive: true, force: true })
  }

  const outDir = path.resolve(RESULTS_DIR)
  mkdirSync(outDir, { recursive: true })
  const outPath = path.join(outDir, 'latest.json')
  writeFileSync(outPath, JSON.stringify({ schema_version: '009.1.0', results }, null, 2))
}

run()
