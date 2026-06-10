#!/usr/bin/env bun
import { randomBytes } from 'node:crypto'
import { appendFileSync, existsSync, mkdirSync, readdirSync, rmSync, unlinkSync } from 'node:fs'
import path from 'node:path'
import { type Static, Type } from '@sinclair/typebox'
import { Value } from '@sinclair/typebox/value'

export const EventBase = Type.Object({
  run_id: Type.String(),
  ts: Type.String(),
  feature_dir: Type.String(),
  duration_ms: Type.Number({ minimum: 0 })
})

export const PhaseDecidedEvent = Type.Object({
  type: Type.Literal('phase_decided'),
  ...EventBase.properties,
  fileset_fingerprint: Type.String(),
  manifest_needs_handoff: Type.Boolean(),
  phase: Type.String(),
  command: Type.String(),
  focus_hint: Type.Union([Type.String(), Type.Null()])
})

export type PhaseDecidedEvent = Static<typeof PhaseDecidedEvent>

export const ManifestEmittedEvent = Type.Object({
  type: Type.Literal('manifest_emitted'),
  ...EventBase.properties,
  subtask_types: Type.Array(Type.String()),
  subtask_count: Type.Number()
})

export type ManifestEmittedEvent = Static<typeof ManifestEmittedEvent>

export const HandoffWrittenEvent = Type.Object({
  type: Type.Literal('handoff_written'),
  ...EventBase.properties,
  path: Type.String(),
  focus: Type.String(),
  ac_row_count: Type.Number(),
  has_e2e_block: Type.Boolean()
})

export type HandoffWrittenEvent = Static<typeof HandoffWrittenEvent>

export const DispatchInvokedEvent = Type.Object({
  type: Type.Literal('dispatch_invoked'),
  ...EventBase.properties,
  opencode_found: Type.Boolean(),
  body_bytes: Type.Number(),
  exit_code: Type.Number(),
  session_id: Type.Union([Type.String(), Type.Null()])
})

export type DispatchInvokedEvent = Static<typeof DispatchInvokedEvent>

// AWO-12.2 — 009 orchestrator event extension types (additive members of WorkflowEvent).
const stageEvent = (typeLiteral: string) =>
  Type.Composite([
    EventBase,
    Type.Object({
      type: Type.Literal(typeLiteral),
      stage: Type.String(),
      attempt: Type.Optional(Type.Integer({ minimum: 0 })),
      elapsed_ms: Type.Optional(Type.Integer({ minimum: 0 })),
      details: Type.Optional(Type.Record(Type.String(), Type.Unknown()))
    })
  ])

export const StageEnteredEvent = stageEvent('stage.entered')
export const StageExitedEvent = stageEvent('stage.exited')
export const StageRetriedEvent = stageEvent('stage.retried')
export const StageEscalatedEvent = stageEvent('stage.escalated')

export const TransitionEvent = Type.Composite([
  EventBase,
  Type.Object({
    type: Type.Union([Type.Literal('transition.auto'), Type.Literal('transition.gated')]),
    from: Type.String(),
    to: Type.String(),
    cause: Type.String()
  })
])

export const TaskInvocationEvent = Type.Composite([
  EventBase,
  Type.Object({
    type: Type.Union([Type.Literal('task.invoked'), Type.Literal('task.completed')]),
    command: Type.String(),
    role: Type.Union([
      Type.Literal('trigger.pre'),
      Type.Literal('trigger.post'),
      Type.Literal('evidence'),
      Type.Literal('provider'),
      Type.Literal('teardown'),
      Type.Literal('retrospective')
    ]),
    stage: Type.Optional(Type.String()),
    exit_code: Type.Optional(Type.Number()),
    duration_ms: Type.Optional(Type.Number({ minimum: 0 })),
    status: Type.Optional(Type.Union([Type.Literal('ok'), Type.Literal('fail'), Type.Literal('cancelled')])),
    cancellation_reason: Type.Optional(Type.String())
  })
])

export const DecisionEvent = Type.Composite([
  EventBase,
  Type.Object({
    type: Type.Union([
      Type.Literal('decision.requested'),
      Type.Literal('decision.defaulted'),
      Type.Literal('decision.answered')
    ]),
    question_id: Type.String(),
    source: Type.Optional(Type.String()),
    rationale: Type.Optional(Type.String())
  })
])

export const SandboxViolationEvent = Type.Composite([
  EventBase,
  Type.Object({
    type: Type.Literal('sandbox.violation'),
    stage: Type.String(),
    descriptor_field: Type.Union([
      Type.Literal('tool_allowlist'),
      Type.Literal('fs_scope'),
      Type.Literal('secret_handling'),
      Type.Literal('network')
    ]),
    attempted: Type.String()
  })
])

export const ContinuityViolationEvent = Type.Composite([
  EventBase,
  Type.Object({
    type: Type.Literal('continuity.violation'),
    offending_field: Type.String(),
    expected_schema_version: Type.String(),
    observed_schema_version: Type.String()
  })
])

export const SchemaViolationEvent = Type.Composite([
  EventBase,
  Type.Object({
    type: Type.Literal('schema.violation'),
    payload_type: Type.String(),
    errors: Type.Array(Type.String())
  })
])

export const ShutdownEvent = Type.Composite([
  EventBase,
  Type.Object({
    type: Type.Union([Type.Literal('shutdown.requested'), Type.Literal('shutdown.completed')]),
    signal: Type.Optional(Type.String()),
    grace_ms: Type.Optional(Type.Number({ minimum: 0 }))
  })
])

export const RunSummaryEvent = Type.Composite([
  EventBase,
  Type.Object({
    type: Type.Literal('run.summary'),
    outcome: Type.Union([
      Type.Literal('terminal_success'),
      Type.Literal('terminal_failure'),
      Type.Literal('cancelled')
    ]),
    lead_time_ms: Type.Integer({ minimum: 0 }),
    stage_durations_ms: Type.Record(Type.String(), Type.Integer({ minimum: 0 })),
    interventions: Type.Integer({ minimum: 0 }),
    retries: Type.Integer({ minimum: 0 })
  })
])

export const WorkflowEvent = Type.Union([
  PhaseDecidedEvent,
  ManifestEmittedEvent,
  HandoffWrittenEvent,
  DispatchInvokedEvent,
  StageEnteredEvent,
  StageExitedEvent,
  StageRetriedEvent,
  StageEscalatedEvent,
  TransitionEvent,
  TaskInvocationEvent,
  DecisionEvent,
  SandboxViolationEvent,
  ContinuityViolationEvent,
  SchemaViolationEvent,
  ShutdownEvent,
  RunSummaryEvent
])

export type WorkflowEvent = Static<typeof WorkflowEvent>

export const WORKFLOW_EVENT_TYPES = [
  'phase_decided',
  'manifest_emitted',
  'handoff_written',
  'dispatch_invoked',
  'stage.entered',
  'stage.exited',
  'stage.retried',
  'stage.escalated',
  'transition.auto',
  'transition.gated',
  'task.invoked',
  'task.completed',
  'decision.requested',
  'decision.defaulted',
  'decision.answered',
  'sandbox.violation',
  'continuity.violation',
  'schema.violation',
  'shutdown.requested',
  'shutdown.completed',
  'run.summary'
] as const

export function generateRunId(slug: string): string {
  const epoch = Date.now()
  const rand = randomBytes(2).toString('hex')
  return `${slug}-${epoch}-${rand}`
}

export function slugFromFeatureDir(featureDir: string): string {
  return path.basename(featureDir).replace(/^\d+-/, '')
}

export type FileSetLike = {
  spec: boolean
  plan: boolean
  tasks: boolean
  handoff: boolean
  analyzePlanChecklist: boolean
  analyzeTasksChecklist: boolean
  handoffEmittedGherkin: boolean
  implementComplete: boolean
}

export function filesetFingerprint(files: FileSetLike): string {
  const s = [
    files.spec,
    files.plan,
    files.tasks,
    files.handoff,
    files.analyzePlanChecklist,
    files.analyzeTasksChecklist,
    files.handoffEmittedGherkin,
    files.implementComplete
  ]
    .map(b => (b ? '1' : '0'))
    .join('')
  const hash = Bun.hash(s).toString(16)
  return hash.padStart(12, '0').slice(0, 12)
}

export class WorkflowRunWriter {
  readonly runId: string
  readonly featureDir: string
  readonly rootDir: string
  private filePath: string | null = null

  constructor(runId: string, featureDir: string, rootDir?: string) {
    this.runId = runId
    this.featureDir = featureDir
    this.rootDir = rootDir ?? path.resolve('tmp/workflow-runs')
  }

  emit(event: WorkflowEvent): void {
    if (!Value.Check(WorkflowEvent, event)) {
      console.error(`[workflow] invalid event: ${JSON.stringify(event)}`)
      return
    }
    this.ensureFilePath()
    if (!this.filePath) return
    try {
      appendFileSync(this.filePath, `${JSON.stringify(event)}\n`)
    } catch (err) {
      console.error(`[workflow] failed to write event: ${err}`)
    }
  }

  get currentPath(): string | null {
    return this.filePath
  }

  private ensureFilePath(): void {
    if (this.filePath) return
    const dateStr = new Date().toISOString().slice(0, 10)
    const dir = path.join(this.rootDir, dateStr)
    try {
      mkdirSync(dir, { recursive: true })
      this.filePath = path.join(dir, `${this.runId}.ndjson`)
    } catch (err) {
      console.error(`[workflow] failed to create directory ${dir}: ${err}`)
    }
  }
}

export function emitPhaseDecided(
  writer: WorkflowRunWriter,
  featureDir: string,
  t0: number,
  files: FileSetLike,
  probe: () => boolean,
  next: { phase: string; command: string; focusHint?: string }
): void {
  writer.emit({
    type: 'phase_decided',
    run_id: writer.runId,
    ts: new Date().toISOString(),
    feature_dir: featureDir,
    duration_ms: performance.now() - t0,
    fileset_fingerprint: filesetFingerprint(files),
    manifest_needs_handoff: probe(),
    phase: next.phase,
    command: next.command,
    focus_hint: next.focusHint ?? null
  })
}

export function pruneOlderThan(days: number, root = 'tmp/workflow-runs'): number {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  let removed = 0
  if (!existsSync(root)) return 0
  for (const entry of readdirSync(root)) {
    const entryPath = path.join(root, entry)
    const dirTime = new Date(`${entry}T00:00:00Z`).getTime()
    if (Number.isNaN(dirTime) || dirTime >= cutoff) continue
    for (const file of readdirSync(entryPath)) {
      try {
        unlinkSync(path.join(entryPath, file))
        removed++
      } catch {}
    }
    try {
      rmSync(entryPath, { recursive: true, force: true })
    } catch {}
  }
  return removed
}

export function bestEffortPrune(root = 'tmp/workflow-runs'): void {
  try {
    pruneOlderThan(30, root)
  } catch {}
}

export function findActiveRun(root = 'tmp/workflow-runs'): string | null {
  if (!existsSync(root)) return null
  const runs = listActiveRuns(root)
  if (runs.length === 1) return runs[0] ?? null
  return null
}

export function listActiveRuns(root = 'tmp/workflow-runs'): string[] {
  if (!existsSync(root)) return []
  const runs: string[] = []
  for (const dateEntry of readdirSync(root)) {
    const dateDir = path.join(root, dateEntry)
    if (!existsSync(dateDir)) continue
    for (const file of readdirSync(dateDir)) {
      if (!file.endsWith('.state.json')) continue
      const runId = file.replace('.state.json', '')
      runs.push(runId)
    }
  }
  return runs.sort()
}
