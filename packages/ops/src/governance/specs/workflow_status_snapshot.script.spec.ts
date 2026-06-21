import { describe, expect, it } from 'bun:test'
import { mkdirSync, readFileSync, rmSync } from 'node:fs'
import path from 'node:path'
import type { WorkflowProgressReport } from '@kb/exec'
import {
  compareSnapshots,
  fingerprintMatches,
  listSnapshots,
  readLatestSnapshot,
  recordSnapshot,
  type SnapshotEntry
} from './workflow_status_snapshot.script'

const TMP_ROOT = path.join(import.meta.dirname, '..', '..', '__tests__', 'fixtures', 'workflow_status')
const SNAPSHOT_TMP = path.join(TMP_ROOT, '__snapshots_test')

function cleanTempDir(): void {
  rmSync(SNAPSHOT_TMP, { recursive: true, force: true })
  mkdirSync(SNAPSHOT_TMP, { recursive: true })
}

const MOCK_REPORT_BASE: WorkflowProgressReport = {
  featureDir: path.join(TMP_ROOT, 'implement-mid'),
  slug: 'implement-mid',
  catalogKey: 'wsu',
  catalogStatus: 'in-progress',
  currentPhase: 'implement',
  next: { command: 'bun run speckit-implement', focusHint: 'phase 2', phase: 'implement' },
  columns: [
    {
      id: 'intent',
      title: 'Intent',
      groupColor: '#ff6b6b',
      rail: { label: '/speckit-specify', kind: 'command', status: 'done' },
      stack: [
        { label: 'spec.md', kind: 'artifact', status: 'done' },
        { label: 'AC rows', kind: 'task', status: 'done' }
      ]
    },
    {
      id: 'design',
      title: 'Design',
      groupColor: '#ff6b6b',
      rail: { label: '/speckit-analyze', kind: 'command', status: 'done' },
      stack: [
        { label: 'plan.md', kind: 'artifact', status: 'done' },
        { label: 'design sketches', kind: 'task', status: 'done' }
      ]
    },
    {
      id: 'breakdown',
      title: 'Breakdown',
      groupColor: '#f0db4f',
      rail: { label: '/speckit-breakdown', kind: 'command', status: 'done' },
      stack: [{ label: 'tasks.md', kind: 'artifact', status: 'done' }]
    },
    {
      id: 'dispatch',
      title: 'Dispatch',
      groupColor: '#f0db4f',
      rail: { label: '/speckit-git-feature', kind: 'command', status: 'skipped' },
      stack: [{ label: 'branch', kind: 'task', status: 'skipped' }]
    },
    {
      id: 'build',
      title: 'Build',
      groupColor: '#5ecfbe',
      rail: { label: '/speckit-implement', kind: 'command', status: 'next' },
      stack: [
        { label: 'T001', kind: 'task', status: 'done' },
        { label: 'T002', kind: 'task', status: 'done' },
        { label: 'T003', kind: 'task', status: 'pending' },
        { label: 'spec ready', kind: 'task', status: 'pending' }
      ]
    },
    {
      id: 'ship',
      title: 'Ship',
      groupColor: '#5ecfbe',
      rail: { label: '/speckit-git-commit', kind: 'command', status: 'pending' },
      stack: []
    }
  ],
  artifactDebt: [{ path: 'plan.md', blockedAt: '', note: 'needs review' }],
  tasks: [
    { id: 'T001', done: true },
    { id: 'T002', done: true },
    { id: 'T003', done: false }
  ],
  commitChunks: [{ id: 'C1', subject: 'phase 1', paths: ['src/foo.ts'] }]
}

function withCleanDir(fn: () => void): void {
  cleanTempDir()
  try {
    fn()
  } finally {
    cleanTempDir()
  }
}

describe('recordSnapshot', () => {
  it('writes a snapshot JSON file', () =>
    withCleanDir(() => {
      const report: WorkflowProgressReport = {
        ...MOCK_REPORT_BASE,
        slug: 'implement-mid',
        featureDir: path.join(TMP_ROOT, 'implement-mid')
      }
      const result = recordSnapshot(report, 'implement-mid')
      expect(result.isErr()).toBe(false)
      if (result.value) {
        const parsed = JSON.parse(readFileSync(result.value, 'utf-8'))
        expect(parsed.meta.slug).toBe('implement-mid')
        expect(parsed.meta.phase).toBe('implement')
        expect(parsed.summary.tasksDone).toBe(2)
        expect(parsed.summary.tasksTotal).toBe(3)
        expect(parsed.summary.nextCommand).toBe('bun run speckit-implement')
        expect(parsed.columns).toHaveLength(6)
        const raw = JSON.parse(parsed.raw)
        expect(raw.currentPhase).toBe('implement')
      }
    }))
})

describe('listSnapshots', () => {
  it('returns empty array for unknown slug', () => {
    expect(listSnapshots('nosuch-slug')).toEqual([])
  })
})

describe('compareSnapshots', () => {
  it('returns error message for non-existent files', () => {
    const diff = compareSnapshots('/no/such/a.json', '/no/such/b.json')
    expect(diff).toContain('error reading snapshots')
  })

  it('diffs two valid snapshots', () =>
    withCleanDir(() => {
      const r1 = recordSnapshot(
        { ...MOCK_REPORT_BASE, featureDir: path.join(TMP_ROOT, 'implement-mid') },
        'implement-mid'
      )
      expect(r1.isErr()).toBe(false)
      const r2 = recordSnapshot(
        {
          ...MOCK_REPORT_BASE,
          currentPhase: 'gate',
          next: { command: 'mise run spec gate', focusHint: 'finish', phase: 'gate' },
          featureDir: path.join(TMP_ROOT, 'gate-ready')
        },
        'gate-ready'
      )
      expect(r2.isErr()).toBe(false)
      if (r1.value && r2.value) {
        const diff = compareSnapshots(r1.value, r2.value)
        expect(diff).toContain('implement')
        expect(diff).toContain('gate')
      }
    }))
})

describe('fingerprintMatches', () => {
  it('returns false for unknown slug', () => {
    expect(fingerprintMatches('/tmp', 'nosuch-slug')).toBe(false)
  })
})

describe('readLatestSnapshot', () => {
  it('returns null for unknown slug', () => {
    expect(readLatestSnapshot('nosuch-slug')).toBeNull()
  })

  it('reads back a recorded snapshot', () =>
    withCleanDir(() => {
      const slug = `readtest-${Date.now()}`
      const r1 = recordSnapshot({ ...MOCK_REPORT_BASE, featureDir: path.join(TMP_ROOT, 'implement-mid') }, slug)
      expect(r1.isErr()).toBe(false)
      const snap = readLatestSnapshot(slug)
      expect(snap).not.toBeNull()
      if (snap) {
        expect(snap.currentPhase).toBe('implement')
        expect(snap.next.command).toBe('bun run speckit-implement')
        expect(snap.columns).toHaveLength(6)
      }
    }))
})

describe('SnapshotEntry type shape', () => {
  it('listSnapshots returns entries with correct keys', () => {
    const entries: SnapshotEntry[] = listSnapshots('nosuch-slug')
    expect(Array.isArray(entries)).toBe(true)
  })
})
