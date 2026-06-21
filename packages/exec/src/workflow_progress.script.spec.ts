import { describe, expect, it } from 'bun:test'
import { makeFiles } from './shared_test_fileset.script'
import {
  type DeriveWorkflowProgressInput,
  deriveManifestNeedsHandoff,
  deriveWorkflowProgress,
  type FileSet,
  parseTaskCheckboxes,
  slugFromDir
} from './workflow_progress.script'

/** Canonical feature dir token (no live assets/specs/ paths in assertions). */
const FEAT = 'features/020-workflow-status'

function derive(
  overrides: Partial<DeriveWorkflowProgressInput> & { files?: FileSet } = {}
): ReturnType<typeof deriveWorkflowProgress> {
  const { files = makeFiles(), ...rest } = overrides
  return deriveWorkflowProgress({ featureDir: FEAT, files, ...rest })
}

describe('slugFromDir', () => {
  it('strips leading digits', () => {
    expect(slugFromDir('features/017-src-cohesion')).toBe('src-cohesion')
  })
})

describe('parseTaskCheckboxes', () => {
  it('parses checked and unchecked T### rows', () => {
    const md = [
      '## Tasks',
      '- [x] **T101** First task',
      '- [ ] **T102** Second task',
      '- [x] **T103**',
      '- [ ] not a task',
      'regular line'
    ].join('\n')
    const tasks = parseTaskCheckboxes(md)
    expect(tasks).toEqual([
      { id: 'T101', done: true, text: 'First task' },
      { id: 'T102', done: false, text: 'Second task' },
      { id: 'T103', done: true, text: undefined }
    ])
  })
})

describe('deriveManifestNeedsHandoff', () => {
  it('defaults to true without handoff markdown', () => {
    expect(deriveManifestNeedsHandoff({ featureDir: FEAT, slug: 'workflow-status' })).toBe(true)
  })

  it('returns true when manifest references gherkin-bdd-handoff', () => {
    const handoffMd = '| SF1AC1 | @ac:SF-1_AC1 | opencode | - | operator smoke |'
    const planMd = 'Plan adds assets/features/e2e/foo.feature'
    expect(deriveManifestNeedsHandoff({ featureDir: FEAT, slug: 'workflow-status', handoffMd, planMd })).toBe(true)
  })
})

describe('deriveWorkflowProgress — shape', () => {
  it('builds six columns left to right', () => {
    const report = derive()
    expect(report.columns).toHaveLength(6)
    expect(report.columns.map(c => c.id)).toEqual(['intent', 'design', 'breakdown', 'dispatch', 'build', 'ship'])
  })

  it('derives slug and preserves feature dir', () => {
    const report = derive()
    expect(report.slug).toBe('workflow-status')
    expect(report.featureDir).toBe(FEAT)
  })
})

describe('deriveWorkflowProgress — phase mapping', () => {
  it('reports gate phase when everything is complete', () => {
    const report = derive()
    expect(report.currentPhase).toBe('gate')
    expect(report.next.phase).toBe('gate')
  })

  it('reports specify phase when spec.md is missing', () => {
    const report = derive({ files: makeFiles({ spec: false }) })
    expect(report.currentPhase).toBe('specify')
    expect(report.columns[0]?.rail.status).toBe('current')
    expect(report.columns[5]?.rail.status).toBe('pending')
  })

  it('reports analyze-plan with tasks/handoff present as debt', () => {
    const files = makeFiles({ analyzePlanChecklist: false })
    const report = derive({ files })
    expect(report.currentPhase).toBe('analyze-plan')
    expect(report.artifactDebt).toContainEqual(expect.objectContaining({ path: 'tasks.md', blockedAt: 'analyze-plan' }))
    const breakdown = report.columns[2]
    expect(breakdown?.stack[0]?.status).toBe('debt')
  })
})

describe('deriveWorkflowProgress — debt rules', () => {
  it('marks tasks.md debt when analyze-plan is not cleared', () => {
    const report = derive({ files: makeFiles({ analyzePlanChecklist: false }) })
    expect(report.artifactDebt.some(d => d.path === 'tasks.md' && d.blockedAt === 'analyze-plan')).toBe(true)
  })

  it('marks handoff.md debt only when analyze-plan is cleared but analyze-tasks is not', () => {
    const beforeAnalyzePlan = derive({ files: makeFiles({ analyzePlanChecklist: false }) })
    expect(beforeAnalyzePlan.artifactDebt.some(d => d.path === 'handoff.md')).toBe(false)

    const atAnalyzeTasks = derive({ files: makeFiles({ analyzeTasksChecklist: false }) })
    expect(atAnalyzeTasks.artifactDebt.some(d => d.path === 'handoff.md' && d.blockedAt === 'analyze-tasks')).toBe(true)
  })
})

describe('deriveWorkflowProgress — dispatch column', () => {
  it('skips dispatch when manifest does not need handoff', () => {
    const report = derive({ manifestNeedsHandoff: false })
    const dispatch = report.columns[3]
    expect(dispatch?.rail.status).toBe('skipped')
    expect(dispatch?.stack[0]?.status).toBe('skipped')
  })

  it('shows dispatch current when in handoff-generate phase', () => {
    const report = derive({
      files: makeFiles({ analyzeTasksChecklist: true, handoffEmittedGherkin: false }),
      manifestNeedsHandoff: true
    })
    expect(report.currentPhase).toBe('handoff-generate')
    expect(report.columns[3]?.rail.status).toBe('current')
  })
})

describe('deriveWorkflowProgress — implement tasks', () => {
  const IMPLEMENT_MID = [
    '- [x] **T101** Done one',
    '- [x] **T102** Done two',
    '- [x] **T103** Done three',
    '- [ ] **T104** Current task',
    '- [ ] **T105** Pending',
    '- [ ] **T106** Pending'
  ].join('\n')

  it('parses tasks and marks current task in implement phase', () => {
    const report = derive({
      files: makeFiles({ implementComplete: false }),
      tasksMd: IMPLEMENT_MID
    })
    expect(report.currentPhase).toBe('implement')
    expect(report.tasks).toHaveLength(6)
    expect(report.tasks[3]).toEqual({ id: 'T104', done: false, text: 'Current task' })
    const build = report.columns[4]
    const taskNodes = build?.stack.filter(n => n.kind === 'task') ?? []
    expect(taskNodes[0]?.status).toBe('done')
    expect(taskNodes[3]?.status).toBe('current')
    expect(taskNodes[4]?.status).toBe('pending')
  })
})

describe('deriveWorkflowProgress — catalog', () => {
  it('flags lifecycle mismatch when shipped but not at gate', () => {
    const report = derive({
      files: makeFiles({ implementComplete: false }),
      catalogKey: 'workflow_status',
      catalogStatus: 'shipped'
    })
    expect(report.lifecycleMismatch).toBe(true)
  })

  it('does not flag mismatch at gate phase', () => {
    const report = derive({ catalogStatus: 'shipped', catalogKey: 'workflow_status' })
    expect(report.lifecycleMismatch).toBeUndefined()
  })
})

describe('deriveWorkflowProgress — commit chunks passthrough', () => {
  it('attaches pre-parsed commit chunks', () => {
    const report = derive({
      commitChunks: [
        { id: 'C1', subject: 'feat(exec): Derive', paths: ['packages/exec/src/workflow_progress.script.ts'] }
      ]
    })
    expect(report.commitChunks).toHaveLength(1)
    expect(report.commitChunks[0]?.id).toBe('C1')
  })
})
