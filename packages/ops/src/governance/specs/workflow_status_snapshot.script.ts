/**
 * Durable workflow status snapshots.
 *
 * Stores portably-serialised `WorkflowProgressReport` snapshots under
 * `tools/metrics/workflow-status/<slug>/<run_id>.status.json` with atomic
 * writes, content fingerprint short-circuit, list, and compare.
 *
 * CLI integration via `mise run spec workflow status --record --list --compare`.
 */

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { filesetFingerprint, scanFeatureDir, type WorkflowProgressReport } from '@kb/exec'
import { type Static, Type } from '@sinclair/typebox'

// ── Schema ────────────────────────────────────────────────────────────────

const WorkflowStatusSnapshot = Type.Object({
  meta: Type.Object({
    slug: Type.String(),
    runId: Type.String(),
    recordedAt: Type.String({ format: 'date-time' }),
    phase: Type.String(),
    contentFingerprint: Type.String()
  }),
  summary: Type.Object({
    tasksDone: Type.Number(),
    tasksTotal: Type.Number(),
    debtCount: Type.Number(),
    nextCommand: Type.String()
  }),
  columns: Type.Array(
    Type.Object({
      id: Type.String(),
      title: Type.String(),
      groupColor: Type.String(),
      railStatus: Type.String(),
      stackStatuses: Type.Array(Type.String())
    })
  ),
  artifactDebt: Type.Array(
    Type.Object({
      path: Type.String(),
      blockedAt: Type.String(),
      note: Type.String()
    })
  ),
  raw: Type.String()
})

type WorkflowStatusSnapshotT = Static<typeof WorkflowStatusSnapshot>

// ── Helpers ───────────────────────────────────────────────────────────────

const SNAPSHOT_DIR = 'tools/metrics/workflow-status'

let _runSeq = 0
function generateRunId(): string {
  _runSeq += 1
  return `${Date.now()}.${_runSeq}`
}

function snapshotDir(slug: string): string {
  return path.join(SNAPSHOT_DIR, slug)
}

function contentFingerprint(featureDir: string, _slug: string): string {
  const files = scanFeatureDir(featureDir)
  const hash = createHash('sha256')
  const fp = filesetFingerprint(files)
  hash.update(fp)
  const extras = ['tasks.md', 'handoff.md', 'plan.md']
  for (const name of extras) {
    const p = path.join(featureDir, name)
    if (existsSync(p)) {
      const content = readFileSync(p)
      hash.update(content)
    }
  }
  return hash.digest('hex').slice(0, 16)
}

function buildColumnSummary(cols: WorkflowProgressReport['columns']): WorkflowStatusSnapshotT['columns'] {
  return cols.map(c => ({
    id: c.id,
    title: c.title,
    groupColor: c.groupColor,
    railStatus: c.rail.status,
    stackStatuses: c.stack.map(n => n.status)
  }))
}

function buildSnapshot(report: WorkflowProgressReport, slug: string, fingerprint: string): WorkflowStatusSnapshotT {
  return {
    meta: {
      slug,
      runId: generateRunId(),
      recordedAt: new Date().toISOString(),
      phase: report.currentPhase,
      contentFingerprint: fingerprint
    },
    summary: {
      tasksDone: report.tasks.filter(t => t.done).length,
      tasksTotal: report.tasks.length,
      debtCount: report.artifactDebt.length,
      nextCommand: report.next.command
    },
    columns: buildColumnSummary(report.columns),
    artifactDebt: report.artifactDebt.map(d => ({ path: d.path, blockedAt: d.blockedAt, note: d.note })),
    raw: JSON.stringify(report)
  }
}

// ── Public API ────────────────────────────────────────────────────────────

export type SnapshotEntry = {
  path: string
  recordedAt: string
  phase: string
  tasksDone: number
  tasksTotal: number
}

/**
 * Write a snapshot to `tools/metrics/workflow-status/<slug>/<run_id>.status.json`.
 * Uses atomic rename (.tmp → final) to prevent partial writes.
 */
export function recordSnapshot(
  report: WorkflowProgressReport,
  slug: string
): { isErr: () => boolean; error?: string; value?: string } {
  try {
    const dir = snapshotDir(slug)
    mkdirSync(dir, { recursive: true })

    const fingerprint = contentFingerprint(report.featureDir, slug)
    const snap = buildSnapshot(report, slug, fingerprint)
    const runId = snap.meta.runId
    const tmpPath = path.join(dir, `.${runId}.tmp`)
    const finalPath = path.join(dir, `${runId}.status.json`)

    writeFileSync(tmpPath, JSON.stringify(snap, null, 2))
    renameSync(tmpPath, finalPath)

    return { isErr: () => false, value: finalPath }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { isErr: () => true, error: msg }
  }
}

/**
 * List snapshots for a slug, sorted newest-first.
 */
export function listSnapshots(slug: string): SnapshotEntry[] {
  const dir = snapshotDir(slug)
  if (!existsSync(dir)) return []

  const files = readdirSync(dir)
    .filter(f => f.endsWith('.status.json'))
    .sort()
    .reverse()

  const entries: SnapshotEntry[] = []
  for (const file of files) {
    try {
      const raw = JSON.parse(readFileSync(path.join(dir, file), 'utf-8')) as WorkflowStatusSnapshotT
      entries.push({
        path: path.join(dir, file),
        recordedAt: raw.meta.recordedAt,
        phase: raw.meta.phase,
        tasksDone: raw.summary.tasksDone,
        tasksTotal: raw.summary.tasksTotal
      })
    } catch {
      /* skip malformed */
    }
  }
  return entries
}

/**
 * Textual diff between two snapshot JSON files.
 */
export function compareSnapshots(aPath: string, bPath: string): string {
  const lines: string[] = []

  const readSnap = (p: string): WorkflowStatusSnapshotT =>
    JSON.parse(readFileSync(p, 'utf-8')) as WorkflowStatusSnapshotT

  let a: WorkflowStatusSnapshotT
  let b: WorkflowStatusSnapshotT
  try {
    a = readSnap(aPath)
    b = readSnap(bPath)
  } catch (err) {
    return `error reading snapshots: ${err instanceof Error ? err.message : String(err)}`
  }

  const phaseDelta =
    a.meta.phase === b.meta.phase
      ? `  Phase: ${a.meta.phase} (unchanged)`
      : `  Phase: ${a.meta.phase} → ${b.meta.phase}`
  lines.push('Comparing:')
  lines.push(`  A: ${aPath} (${a.meta.recordedAt})`)
  lines.push(`  B: ${bPath} (${b.meta.recordedAt})`)
  lines.push(phaseDelta)
  lines.push(`  Tasks: ${a.summary.tasksDone}/${a.summary.tasksTotal} → ${b.summary.tasksDone}/${b.summary.tasksTotal}`)
  lines.push(`  Debt: ${a.summary.debtCount} → ${b.summary.debtCount}`)

  const aCols = new Map(a.columns.map(c => [c.id, c] as const))
  const bCols = new Map(b.columns.map(c => [c.id, c] as const))

  for (const colId of ['intent', 'design', 'breakdown', 'dispatch', 'build', 'ship']) {
    const ac = aCols.get(colId)
    const bc = bCols.get(colId)
    if (!ac || !bc) continue
    if (ac.railStatus !== bc.railStatus) {
      lines.push(`  Column ${colId} rail: ${ac.railStatus} → ${bc.railStatus}`)
    }
    for (let i = 0; i < Math.max(ac.stackStatuses.length, bc.stackStatuses.length); i++) {
      const as = ac.stackStatuses[i]
      const bs = bc.stackStatuses[i]
      if (as !== bs) {
        lines.push(`  Column ${colId} stack[${i}]: ${as ?? '-'} → ${bs ?? '-'}`)
      }
    }
  }

  return lines.join('\n')
}

/**
 * Check whether the latest snapshot fingerprint matches current content.
 * If yes, return true to short-circuit re-derive.
 */
export function fingerprintMatches(featureDir: string, slug: string): boolean {
  const entries = listSnapshots(slug)
  if (entries.length === 0) return false

  const latest = entries[0]
  if (!latest) return false

  const current = contentFingerprint(featureDir, slug)
  try {
    const raw = JSON.parse(readFileSync(latest.path, 'utf-8')) as WorkflowStatusSnapshotT
    return raw.meta.contentFingerprint === current
  } catch {
    return false
  }
}

/**
 * Read the latest snapshot's raw `WorkflowProgressReport` for cache replay.
 * Returns `null` when no snapshot exists or parsing fails.
 */
export function readLatestSnapshot(slug: string): WorkflowProgressReport | null {
  const entries = listSnapshots(slug)
  if (entries.length === 0) return null

  const latest = entries[0]
  if (!latest) return null

  try {
    const raw = JSON.parse(readFileSync(latest.path, 'utf-8')) as WorkflowStatusSnapshotT
    return JSON.parse(raw.raw) as WorkflowProgressReport
  } catch {
    return null
  }
}
