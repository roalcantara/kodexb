#!/usr/bin/env bun
import { randomBytes } from 'node:crypto'
import { appendFileSync, existsSync, mkdirSync, readdirSync, rmSync, unlinkSync } from 'node:fs'
import path from 'node:path'
import { type Static, Type } from '@sinclair/typebox'
import { Value } from '@sinclair/typebox/value'

const BASE = {
  run_id: Type.String(),
  ts: Type.String(),
  feature_dir: Type.String(),
  duration_ms: Type.Number()
}

export const PhaseDecidedEvent = Type.Object({
  type: Type.Literal('phase_decided'),
  ...BASE,
  fileset_fingerprint: Type.String(),
  manifest_needs_handoff: Type.Boolean(),
  phase: Type.String(),
  command: Type.String(),
  focus_hint: Type.Union([Type.String(), Type.Null()])
})

export type PhaseDecidedEvent = Static<typeof PhaseDecidedEvent>

export const ManifestEmittedEvent = Type.Object({
  type: Type.Literal('manifest_emitted'),
  ...BASE,
  subtask_types: Type.Array(Type.String()),
  subtask_count: Type.Number()
})

export type ManifestEmittedEvent = Static<typeof ManifestEmittedEvent>

export const HandoffWrittenEvent = Type.Object({
  type: Type.Literal('handoff_written'),
  ...BASE,
  path: Type.String(),
  focus: Type.String(),
  ac_row_count: Type.Number(),
  has_e2e_block: Type.Boolean()
})

export type HandoffWrittenEvent = Static<typeof HandoffWrittenEvent>

export const DispatchInvokedEvent = Type.Object({
  type: Type.Literal('dispatch_invoked'),
  ...BASE,
  opencode_found: Type.Boolean(),
  body_bytes: Type.Number(),
  exit_code: Type.Number(),
  session_id: Type.Union([Type.String(), Type.Null()])
})

export type DispatchInvokedEvent = Static<typeof DispatchInvokedEvent>

export const WorkflowEvent = Type.Union([
  PhaseDecidedEvent,
  ManifestEmittedEvent,
  HandoffWrittenEvent,
  DispatchInvokedEvent
])

export type WorkflowEvent = Static<typeof WorkflowEvent>

export const WORKFLOW_EVENT_TYPES = [
  'phase_decided',
  'manifest_emitted',
  'handoff_written',
  'dispatch_invoked'
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
