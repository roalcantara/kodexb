import { describe, expect, it } from 'bun:test'
import path from 'node:path'
import { detectPhase, scanFeatureDir } from '@kb/exec'
import { buildWorkflowReport } from './workflow_status.script'
import { renderWorkflowStatusHtml } from './workflow_status_html.script'
import { emitMermaid, renderMermaid } from './workflow_status_output.script'
import { compareSnapshots, listSnapshots, recordSnapshot } from './workflow_status_snapshot.script'

const FIXTURE_ROOT = path.join(__dirname, '..', '..', '__tests__', 'fixtures', 'workflow_status')

const FIXTURES = {
  early: path.join(FIXTURE_ROOT, 'early'),
  postPlan: path.join(FIXTURE_ROOT, 'post-plan'),
  implementMid: path.join(FIXTURE_ROOT, 'implement-mid'),
  gateReady: path.join(FIXTURE_ROOT, 'gate-ready')
} as const

describe('buildWorkflowReport — fixtures', () => {
  it('early fixture (spec only) reports plan phase', () => {
    const { report } = buildWorkflowReport(FIXTURES.early)
    expect(report.currentPhase).toBe('plan')
    expect(report.slug).toBe('early')
    expect(report.columns).toHaveLength(6)
  })

  it('post-plan fixture reports analyze-plan phase', () => {
    const { report } = buildWorkflowReport(FIXTURES.postPlan)
    expect(report.currentPhase).toBe('analyze-plan')
    expect(report.next.command).toBe('speckit.analyze')
    expect(report.next.focusHint).toContain('plan.md')
  })

  it('implement-mid fixture reports implement phase with skipped dispatch', () => {
    const { report } = buildWorkflowReport(FIXTURES.implementMid)
    expect(report.currentPhase).toBe('implement')
    const dispatch = report.columns[3]
    if (!dispatch) throw new Error('expected dispatch column')
    expect(dispatch.rail.status).toBe('skipped')
    expect(dispatch.stack[0]?.status).toBe('skipped')
  })

  it('gate-ready fixture reports gate phase', () => {
    const { report } = buildWorkflowReport(FIXTURES.gateReady)
    expect(report.currentPhase).toBe('gate')
    expect(report.next.command).toContain('spec gate')
  })
})

describe('buildWorkflowReport — next.command matches detectPhase', () => {
  for (const [name, dir] of Object.entries(FIXTURES) as [string, string][]) {
    it(`${name}: next.command matches direct detectPhase`, () => {
      const { report } = buildWorkflowReport(dir)
      const files = scanFeatureDir(dir)
      const col3 = report.columns[3]
      if (!col3) throw new Error('expected dispatch column')
      const direct = detectPhase(files, dir, () => col3.rail.status !== 'skipped')
      expect(report.next.phase).toBe(direct.phase)
      expect(report.next.command).toBe(direct.command)
    })
  }
})

describe('buildWorkflowReport — implement-mid tasks + commit chunks', () => {
  it('parses T### checkboxes and commit plan', () => {
    const { report } = buildWorkflowReport(FIXTURES.implementMid)
    expect(report.tasks.length).toBeGreaterThan(0)
    const done = report.tasks.filter(t => t.done)
    expect(done.length).toBeGreaterThan(0)
    expect(report.commitChunks.length).toBeGreaterThan(0)
    expect(report.commitChunks.some(c => c.id === 'C1')).toBe(true)
  })

  it('marks tasks as done|pending only (no current)', () => {
    const { report } = buildWorkflowReport(FIXTURES.implementMid)
    const build = report.columns[4]
    if (!build) throw new Error('expected build column')
    const taskNodes = build.stack.filter(n => n.kind === 'task' && !n.label.startsWith('…'))
    expect(taskNodes.every(n => n.status === 'done' || n.status === 'pending')).toBe(true)
  })

  it('keeps spec ready pending while the first commit chunk is incomplete', () => {
    const { report } = buildWorkflowReport(FIXTURES.implementMid)
    const build = report.columns[4]
    if (!build) throw new Error('expected build column')
    const ready = build.stack.find(n => n.label.includes('spec ready'))
    expect(ready?.status).toBe('pending')
  })
})

describe('buildWorkflowReport — JSON stability', () => {
  it('serializes without ANSI escapes or timestamps', () => {
    const { report } = buildWorkflowReport(FIXTURES.implementMid)
    const json = JSON.stringify(report)
    expect(json).not.toContain('\u001b')
    expect(json.toLowerCase()).not.toContain('timestamp')
    expect(json).toContain('"currentPhase":"implement"')
  })
})

describe('renderMermaid', () => {
  it('emits rail-only flowchart LR with six columns', () => {
    const { report } = buildWorkflowReport(FIXTURES.implementMid)
    const md = renderMermaid(report)
    expect(md).toContain('flowchart LR')
    expect(md).toContain('intent')
    expect(md).toContain('ship')
    expect(md).toContain('intent --> design')
    expect(md).toContain('build --> ship')
    expect(md).not.toContain('subgraph')
  })

  it('emits subgraph flowchart when subgraph option is set', () => {
    const { report } = buildWorkflowReport(FIXTURES.implementMid)
    const md = renderMermaid(report, { subgraph: true })
    expect(md).toContain('flowchart LR')
    expect(md).toContain('subgraph intent_col')
    expect(md).toContain('subgraph build_col')
    expect(md).toContain('intent_col --> design_col')
    expect(md).toContain('build_col --> ship_col')
    expect(md).toContain('build_rail')
    expect(md).toContain(':::skipped')
    expect(md).toContain('classDef done')
    expect(md).toContain('style build_col stroke:#5ecfbe')
    expect(md).not.toContain('intent --> design')
  })
})

describe('emitMermaid', () => {
  it('returns mermaid source when source option is set', () => {
    const { report } = buildWorkflowReport(FIXTURES.implementMid)
    const out = emitMermaid(report, { source: true })
    expect(out.text).toContain('flowchart LR')
    expect(out.text).toContain('intent --> design')
    expect(out.note).toBeUndefined()
  })

  it('returns terminal ASCII when source is false', () => {
    const { report } = buildWorkflowReport(FIXTURES.implementMid)
    const out = emitMermaid(report, { source: false, termWidth: 200 })
    expect(out.text).not.toContain('flowchart LR')
    expect(out.text).toContain('/speckit-specify')
  })

  it('falls back to rail-only ASCII when subgraph exceeds termWidth', () => {
    const { report } = buildWorkflowReport(FIXTURES.implementMid)
    const out = emitMermaid(report, { subgraph: true, source: false, termWidth: 80 })
    expect(out.note).toContain('rail-only')
    expect(out.text).not.toContain('subgraph')
    expect(out.text).toContain('/speckit-plan')
  })
})

describe('renderWorkflowStatusHtml', () => {
  it('produces a self-contained HTML document with six columns', () => {
    const { report } = buildWorkflowReport(FIXTURES.implementMid)
    const html = renderWorkflowStatusHtml(report)
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('grid-template-columns: repeat(6, 1fr)')
    expect(html).toContain(report.slug)
    expect(html).toContain(report.next.command)
  })

  it('flags the active build column', () => {
    const { report } = buildWorkflowReport(FIXTURES.implementMid)
    const html = renderWorkflowStatusHtml(report)
    expect(html).toContain('ACTIVE')
  })

  it('renders skipped dispatch for implement-mid', () => {
    const { report } = buildWorkflowReport(FIXTURES.implementMid)
    const html = renderWorkflowStatusHtml(report)
    expect(html).toContain('skipped')
  })
})

describe('workflow_status next semantics', () => {
  it('implement-mid: rail is next, not current', () => {
    const { report } = buildWorkflowReport(FIXTURES.implementMid)
    const build = report.columns[4]
    if (!build) throw new Error('expected build column')
    expect(build.rail.status).toBe('next')
    expect(build.rail.label).toBe('/speckit-implement')
  })

  it('no node has status current across all fixtures', () => {
    for (const dir of Object.values(FIXTURES)) {
      const { report } = buildWorkflowReport(dir)
      const allStatuses = report.columns.flatMap(c => [c.rail, ...c.stack]).map(n => n.status)
      expect(allStatuses).not.toContain('current')
    }
  })
})

describe('snapshot record/list/compare integration', () => {
  it('record then list then compare returns meaningful diff', () => {
    const { report } = buildWorkflowReport(FIXTURES.implementMid)
    const slug = 'e2e-workflow-status-test'

    const r1 = recordSnapshot(report, slug)
    expect(r1.isErr()).toBe(false)

    const entries = listSnapshots(slug)
    expect(entries.length).toBeGreaterThanOrEqual(1)
    expect(entries[0]?.phase).toBe('implement')

    const report2 = { ...report, currentPhase: 'gate' } as typeof report
    const r2 = recordSnapshot(report2, slug)
    expect(r2.isErr()).toBe(false)

    if (r1.value && r2.value) {
      const diff = compareSnapshots(r1.value, r2.value)
      expect(diff).toContain('Phase: implement → gate')
    }
  })
})
