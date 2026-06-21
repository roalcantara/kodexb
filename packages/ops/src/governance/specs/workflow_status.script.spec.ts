import { describe, expect, it } from 'bun:test'
import path from 'node:path'
import { detectPhase, scanFeatureDir } from '@kb/exec'
import { buildWorkflowReport } from './workflow_status.script'
import { renderWorkflowStatusHtml } from './workflow_status_html.script'
import { renderMermaid } from './workflow_status_output.script'

const FIXTURE_ROOT = path.join(__dirname, '..', '..', '__tests__', 'fixtures', 'workflow_status')

const FIXTURES = {
  early: path.join(FIXTURE_ROOT, 'early'),
  postPlan: path.join(FIXTURE_ROOT, 'post-plan'),
  implementMid: path.join(FIXTURE_ROOT, 'implement-mid'),
  gateReady: path.join(FIXTURE_ROOT, 'gate-ready')
} as const

describe('buildWorkflowReport — fixtures', () => {
  it('early fixture (spec only) reports plan phase', () => {
    const report = buildWorkflowReport(FIXTURES.early)
    expect(report.currentPhase).toBe('plan')
    expect(report.slug).toBe('early')
    expect(report.columns).toHaveLength(6)
  })

  it('post-plan fixture reports analyze-plan phase', () => {
    const report = buildWorkflowReport(FIXTURES.postPlan)
    expect(report.currentPhase).toBe('analyze-plan')
    expect(report.next.command).toBe('speckit.analyze')
    expect(report.next.focusHint).toContain('plan.md')
  })

  it('implement-mid fixture reports implement phase with skipped dispatch', () => {
    const report = buildWorkflowReport(FIXTURES.implementMid)
    expect(report.currentPhase).toBe('implement')
    const dispatch = report.columns[3]
    if (!dispatch) throw new Error('expected dispatch column')
    expect(dispatch.rail.status).toBe('skipped')
    expect(dispatch.stack[0]?.status).toBe('skipped')
  })

  it('gate-ready fixture reports gate phase', () => {
    const report = buildWorkflowReport(FIXTURES.gateReady)
    expect(report.currentPhase).toBe('gate')
    expect(report.next.command).toContain('spec gate')
  })
})

describe('buildWorkflowReport — next.command matches detectPhase', () => {
  for (const [name, dir] of Object.entries(FIXTURES) as [string, string][]) {
    it(`${name}: next.command matches direct detectPhase`, () => {
      const report = buildWorkflowReport(dir)
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
    const report = buildWorkflowReport(FIXTURES.implementMid)
    expect(report.tasks.length).toBeGreaterThan(0)
    const done = report.tasks.filter(t => t.done)
    expect(done.length).toBeGreaterThan(0)
    expect(report.commitChunks.length).toBeGreaterThan(0)
    expect(report.commitChunks.some(c => c.id === 'C1')).toBe(true)
  })

  it('marks only the first incomplete task as current', () => {
    const report = buildWorkflowReport(FIXTURES.implementMid)
    const build = report.columns[4]
    if (!build) throw new Error('expected build column')
    const taskNodes = build.stack.filter(n => n.kind === 'task' && !n.label.startsWith('…'))
    const currentNodes = taskNodes.filter(n => n.status === 'current')
    expect(currentNodes).toHaveLength(1)
  })
})

describe('buildWorkflowReport — JSON stability', () => {
  it('serializes without ANSI escapes or timestamps', () => {
    const report = buildWorkflowReport(FIXTURES.implementMid)
    const json = JSON.stringify(report)
    expect(json).not.toContain('\u001b')
    expect(json.toLowerCase()).not.toContain('timestamp')
    expect(json).toContain('"currentPhase":"implement"')
  })
})

describe('renderMermaid', () => {
  it('emits rail-only flowchart LR with six columns', () => {
    const report = buildWorkflowReport(FIXTURES.implementMid)
    const md = renderMermaid(report)
    expect(md).toContain('flowchart LR')
    expect(md).toContain('intent')
    expect(md).toContain('ship')
    expect(md).toContain('intent --> design')
    expect(md).toContain('build --> ship')
    expect(md).not.toContain('subgraph')
  })
})

describe('renderWorkflowStatusHtml', () => {
  it('produces a self-contained HTML document with six columns', () => {
    const report = buildWorkflowReport(FIXTURES.implementMid)
    const html = renderWorkflowStatusHtml(report)
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('grid-template-columns: repeat(6, 1fr)')
    expect(html).toContain(report.slug)
    expect(html).toContain(report.next.command)
  })

  it('flags the active build column', () => {
    const report = buildWorkflowReport(FIXTURES.implementMid)
    const html = renderWorkflowStatusHtml(report)
    expect(html).toContain('ACTIVE')
  })

  it('renders skipped dispatch for implement-mid', () => {
    const report = buildWorkflowReport(FIXTURES.implementMid)
    const html = renderWorkflowStatusHtml(report)
    expect(html).toContain('skipped')
  })
})
