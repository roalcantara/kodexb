import { describe, expect, it } from 'bun:test'
import { makeFiles } from './shared_test_fileset.script'
import {
  type DeriveWorkflowProgressInput,
  deriveManifestNeedsHandoff,
  deriveWorkflowProgress,
  type FileSet,
  matchNodeToNext,
  normalizeCommand,
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
    const intentRail = report.columns[0]?.rail
    expect(intentRail?.status).toBe('next')
    expect(normalizeCommand(intentRail?.label ?? '')).toBe(normalizeCommand(report.next.command))
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
    const breakdownBefore = beforeAnalyzePlan.columns[2]
    expect(breakdownBefore?.stack.find(n => n.path === 'handoff.md')?.status).not.toBe('debt')

    const atAnalyzeTasks = derive({ files: makeFiles({ analyzeTasksChecklist: false }) })
    expect(atAnalyzeTasks.artifactDebt.some(d => d.path === 'handoff.md' && d.blockedAt === 'analyze-tasks')).toBe(true)
    const breakdownAt = atAnalyzeTasks.columns[2]
    expect(breakdownAt?.stack.find(n => n.path === 'handoff.md')?.status).toBe('debt')
  })
})

describe('deriveWorkflowProgress — dispatch column', () => {
  it('skips dispatch when manifest does not need handoff', () => {
    const report = derive({ manifestNeedsHandoff: false })
    const dispatch = report.columns[3]
    expect(dispatch?.rail.status).toBe('skipped')
    expect(dispatch?.stack[0]?.status).toBe('skipped')
  })

  it('shows dispatch rail is next when in handoff-generate phase', () => {
    const report = derive({
      files: makeFiles({ analyzeTasksChecklist: true, handoffEmittedGherkin: false }),
      manifestNeedsHandoff: true
    })
    expect(report.currentPhase).toBe('handoff-generate')
    expect(report.columns[3]?.rail.status).toBe('next')
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

  it('parses tasks and marks only done/pending in implement phase', () => {
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
    expect(taskNodes[3]?.status).toBe('pending')
    expect(taskNodes[4]?.status).toBe('pending')
    expect(taskNodes?.every(n => n.status === 'done' || n.status === 'pending')).toBe(true)
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

function conformNode(report: ReturnType<typeof deriveWorkflowProgress>) {
  return report.columns[2]?.stack.find(n => n.label === 'mise run spec conform')
}

describe('deriveWorkflowProgress — conform status', () => {
  const CONFORMED_HANDOFF = [
    '| ID | Done when | Evidence |',
    '| --- | --- | --- |',
    '| SF-1 AC1 | criterion | `evidence` |'
  ].join('\n')
  const CONFORMED_TASKS = '- [ ] **T101** First implementation task\n'

  it('marks conform done at implement when handoff rows and T101+ tasks are present', () => {
    const report = derive({
      files: makeFiles({ implementComplete: false }),
      handoffMd: CONFORMED_HANDOFF,
      tasksMd: CONFORMED_TASKS
    })
    expect(report.currentPhase).toBe('implement')
    expect(conformNode(report)?.status).toBe('done')
  })

  it('marks conform done at gate with default complete fixture', () => {
    const report = derive({
      handoffMd: CONFORMED_HANDOFF,
      tasksMd: CONFORMED_TASKS
    })
    expect(conformNode(report)?.status).toBe('done')
  })

  it('marks conform pending when outputs are missing (no current)', () => {
    const report = derive({ files: makeFiles({ analyzePlanChecklist: false }) })
    expect(report.currentPhase).toBe('analyze-plan')
    expect(conformNode(report)?.status).toBe('pending')
  })

  it('marks conform pending before tasks.md exists', () => {
    const report = derive({ files: makeFiles({ tasks: false, handoff: false, analyzeTasksChecklist: false }) })
    expect(report.currentPhase).toBe('tasks')
    expect(conformNode(report)?.status).toBe('pending')
  })
})

function stackNode(report: ReturnType<typeof deriveWorkflowProgress>, labelPart: string) {
  for (const col of report.columns) {
    const node = col.stack.find(n => n.label.includes(labelPart))
    if (node) return node
  }
}

describe('deriveWorkflowProgress — advisory and ship nodes', () => {
  const CHUNK_C1 = { id: 'C1', paths: ['a.ts'], taskIds: ['T101', 'T102'] }
  const CHUNK_C2 = { id: 'C2', paths: ['b.ts'], taskIds: ['T103'] }

  it('skips clarify once plan stage is cleared', () => {
    const report = derive()
    expect(stackNode(report, '/speckit-clarify')?.status).toBe('skipped')
  })

  it('keeps clarify pending during specify', () => {
    const report = derive({
      files: makeFiles({
        spec: true,
        plan: false,
        tasks: false,
        handoff: false,
        analyzePlanChecklist: false,
        analyzeTasksChecklist: false,
        handoffEmittedGherkin: false,
        implementComplete: false
      })
    })
    expect(report.currentPhase).toBe('plan')
    expect(stackNode(report, '/speckit-clarify')?.status).toBe('pending')
  })

  it('keeps spec ready pending while the active commit chunk is incomplete', () => {
    const report = derive({
      files: makeFiles({ implementComplete: false }),
      tasksMd: ['- [ ] **T101** First', '- [ ] **T102** Second'].join('\n'),
      commitChunks: [CHUNK_C1, CHUNK_C2]
    })
    expect(stackNode(report, 'spec ready')?.status).toBe('pending')
  })

  it('marks spec ready pending when next rail wins the single next slot', () => {
    const report = derive({
      files: makeFiles({ implementComplete: false }),
      tasksMd: ['- [x] **T101** First', '- [x] **T102** Second', '- [ ] **T103** Third'].join('\n'),
      commitChunks: [CHUNK_C1, CHUNK_C2]
    })
    const ready = stackNode(report, 'spec ready')
    expect(ready?.status).toBe('pending')
    expect(ready?.label).toBe('mise run spec ready --phase C1 --commit')
  })

  it('marks ship closeout done and catalog promote pending at gate', () => {
    const report = derive({ catalogStatus: 'in-progress' })
    expect(report.currentPhase).toBe('gate')
    expect(stackNode(report, 'spec closeout')?.status).toBe('done')
    expect(stackNode(report, 'catalog promote')?.status).toBe('pending')
  })

  it('marks catalog promote done when catalog is shipped', () => {
    const report = derive({ catalogStatus: 'shipped', catalogKey: 'workflow_status' })
    expect(stackNode(report, 'catalog promote')?.status).toBe('done')
  })
})

describe('normalizeCommand', () => {
  const cases = [
    { name: '/speckit-implement → speckit.implement', input: '/speckit-implement', want: 'speckit.implement' },
    { name: 'speckit.implement stays speckit.implement', input: 'speckit.implement', want: 'speckit.implement' },
    {
      name: 'mise run spec gate strips dir',
      input: 'mise run spec gate tmp/specs/test-018',
      want: 'mise run spec gate'
    },
    { name: 'mise run spec gate strips {dir}', input: 'mise run spec gate {dir}', want: 'mise run spec gate' },
    {
      name: 'handoff generate strips dir',
      input: 'mise run spec workflow handoff generate tmp/specs/test-018 --focus gherkin',
      want: 'mise run spec workflow handoff generate --focus gherkin'
    },
    {
      name: 'strips parenthetical hints',
      input: 'speckit.specify (or `mise run spec init...`)',
      want: 'speckit.specify'
    }
  ]
  for (const { name, input, want } of cases) {
    it(name, () => {
      expect(normalizeCommand(input)).toBe(want)
    })
  }
})

describe('matchNodeToNext', () => {
  it('matches /speckit-implement rail with speckit.implement command', () => {
    expect(matchNodeToNext({ label: '/speckit-implement' }, { command: 'speckit.implement' })).toBe(true)
  })

  it('matches mise run spec gate rail with dir command', () => {
    expect(
      matchNodeToNext({ label: 'mise run spec gate {dir}' }, { command: 'mise run spec gate tmp/specs/test-018' })
    ).toBe(true)
  })

  it('does not match unrelated rail', () => {
    expect(matchNodeToNext({ label: '/speckit-specify' }, { command: 'speckit.implement' })).toBe(false)
  })
})

describe('WSU-1 next semantics', () => {
  it('derivation never assigns current (WSU-1 AC1)', () => {
    const allStatuses = (report: ReturnType<typeof deriveWorkflowProgress>): NodeStatus[] =>
      report.columns.flatMap(c => [c.rail, ...c.stack]).map(n => n.status)
    const gateReport = derive()
    expect(allStatuses(gateReport)).not.toContain('current')
    const specifyReport = derive({ files: makeFiles({ spec: false }) })
    expect(allStatuses(specifyReport)).not.toContain('current')
    const planReport = derive({
      files: makeFiles({
        plan: false,
        spec: true,
        tasks: false,
        handoff: false,
        analyzePlanChecklist: false,
        analyzeTasksChecklist: false,
        handoffEmittedGherkin: false,
        implementComplete: false
      })
    })
    expect(allStatuses(planReport)).not.toContain('current')
  })

  it('exactly one node has status next (WSU-1 AC2)', () => {
    const report = derive({ files: makeFiles({ implementComplete: false }) })
    const nextNodes = report.columns.flatMap(c => [c.rail, ...c.stack]).filter(n => n.status === 'next')
    expect(nextNodes).toHaveLength(1)
    expect(nextNodes[0]?.label).toBe('/speckit-implement')
  })

  it('unchecked T### tasks are pending only (WSU-1 AC3)', () => {
    const tasksMd = ['- [x] **T101** Done', '- [ ] **T102** Pending'].join('\n')
    const report = derive({ files: makeFiles({ implementComplete: false }), tasksMd })
    const taskNodes = report.columns[4]?.stack.filter(n => n.kind === 'task') ?? []
    expect(taskNodes[0]?.status).toBe('done')
    expect(taskNodes[1]?.status).toBe('pending')
    expect(taskNodes.every(n => n.status === 'done' || n.status === 'pending')).toBe(true)
  })

  it('/speckit-implement rail is next when phase is implement (WSU-1 AC4)', () => {
    const report = derive({ files: makeFiles({ implementComplete: false }) })
    expect(report.currentPhase).toBe('implement')
    expect(report.columns[4]?.rail.status).toBe('next')
  })
})
