import { afterEach, describe, expect, it } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
  buildSubtaskManifest,
  detectPhase,
  type FileSet,
  parseArgs,
  renderManifestXml,
  runLint,
  scanFeatureDir
} from './orchestrated_handoff.script.ts'

const PILOT_FEATURE_DIR = 'assets/specs/003-sync-frecency-preserve'

function makeFiles(overrides: Partial<FileSet> = {}): FileSet {
  return {
    spec: true,
    plan: true,
    tasks: true,
    handoff: true,
    analyzePlanChecklist: true,
    analyzeTasksChecklist: true,
    handoffEmittedGherkin: true,
    implementComplete: true,
    ...overrides
  }
}

describe('detectPhase — transition table', () => {
  it('no spec.md → speckit.specify', () => {
    const r = detectPhase(makeFiles({ spec: false }))
    expect(r.phase).toBe('specify')
    expect(r.command).toContain('speckit.specify')
  })

  it('spec.md without plan.md → speckit.plan with lint hint', () => {
    const r = detectPhase(makeFiles({ plan: false }))
    expect(r.phase).toBe('plan')
    expect(r.command).toBe('speckit.plan')
    expect(r.focusHint).toContain('--lint')
  })

  it('plan.md without analyze-plan checklist → speckit.analyze with plan-pass hint', () => {
    const r = detectPhase(makeFiles({ analyzePlanChecklist: false }))
    expect(r.phase).toBe('analyze-plan')
    expect(r.command).toBe('speckit.analyze')
    expect(r.focusHint).toContain('plan.md traceability')
  })

  it('analyze-plan done but no tasks.md → speckit.tasks', () => {
    const r = detectPhase(makeFiles({ tasks: false }))
    expect(r.phase).toBe('tasks')
    expect(r.command).toBe('speckit.tasks')
  })

  it('A2: tasks.md without handoff.md → speckit.tasks (do not skip ahead)', () => {
    const r = detectPhase(makeFiles({ handoff: false, analyzeTasksChecklist: false, handoffEmittedGherkin: false }))
    expect(r.phase).toBe('tasks')
    expect(r.command).toBe('speckit.tasks')
    expect(r.focusHint).toContain('handoff.md')
  })

  it('tasks + handoff without analyze-tasks checklist → speckit.analyze with tasks-pass hint', () => {
    const r = detectPhase(makeFiles({ analyzeTasksChecklist: false }))
    expect(r.phase).toBe('analyze-tasks')
    expect(r.command).toBe('speckit.analyze')
    expect(r.focusHint).toContain('tasks.md + handoff.md Evidence')
  })

  it('A1: analyze-tasks done + manifest NEEDS handoff → handoff-generate', () => {
    const r = detectPhase(
      makeFiles({ handoffEmittedGherkin: false, implementComplete: false }),
      'assets/specs/003-sync-frecency-preserve',
      () => true
    )
    expect(r.phase).toBe('handoff-generate')
    expect(r.command).toContain('mise run spec handoff-generate')
    expect(r.command).toContain('--focus gherkin')
    expect(r.command).toContain('003-sync-frecency-preserve')
  })

  it('A1: analyze-tasks done + manifest does NOT need handoff → speckit.implement', () => {
    const r = detectPhase(
      makeFiles({ handoffEmittedGherkin: false, implementComplete: false }),
      'assets/specs/006-unit-only-feature',
      () => false
    )
    expect(r.phase).toBe('implement')
    expect(r.command).toBe('speckit.implement')
  })

  it('handoff emitted, implement not complete → speckit.implement', () => {
    const r = detectPhase(makeFiles({ implementComplete: false }))
    expect(r.phase).toBe('implement')
    expect(r.command).toBe('speckit.implement')
  })

  it('A3: implement-done checklist marker → mise run spec gate', () => {
    const r = detectPhase(makeFiles(), 'assets/specs/003-sync-frecency-preserve')
    expect(r.phase).toBe('gate')
    expect(r.command).toContain('mise run spec gate')
    expect(r.command).toContain('003-sync-frecency-preserve')
  })
})

describe('buildSubtaskManifest', () => {
  it('always includes implement-src', () => {
    const subtasks = buildSubtaskManifest({
      featureDir: 'x',
      slug: 'x',
      handoffMd: '',
      planMd: null
    })
    expect(subtasks[0]?.type).toBe('implement-src')
    expect(subtasks[0]?.provider).toBe('primary')
  })

  it('adds gherkin-bdd-handoff when handoff has an operator-smoke row', () => {
    const handoffMd = [
      '| ID       | Done when    | Evidence                                 |',
      '| -------- | ------------ | ---------------------------------------- |',
      '| SF-3 AC3 | UI one sync  | Operator smoke below — pending human run |'
    ].join('\n')
    const subtasks = buildSubtaskManifest({
      featureDir: 'assets/specs/003-x',
      slug: 'sync-frecency-preserve',
      handoffMd,
      planMd: null
    })
    expect(subtasks.find(s => s.type === 'gherkin-bdd-handoff')).toBeDefined()
    const gherkin = subtasks.find(s => s.type === 'gherkin-bdd-handoff')
    expect(gherkin?.provider).toBe('opencode')
    expect(gherkin?.description).toContain('tmp/handoffs/opencode-sync-frecency-preserve-gherkin.md')
  })

  it('adds gherkin-bdd-handoff when plan mentions assets/features/', () => {
    const handoffMd = [
      '| ID       | Done when | Evidence            |',
      '| -------- | --------- | ------------------- |',
      '| SF-1 AC1 | works     | `bun test path`     |'
    ].join('\n')
    const planMd = 'Plan refers to assets/features/foo.feature in section X.'
    const subtasks = buildSubtaskManifest({
      featureDir: 'x',
      slug: 'x',
      handoffMd,
      planMd
    })
    expect(subtasks.find(s => s.type === 'gherkin-bdd-handoff')).toBeDefined()
  })

  it('omits gherkin-bdd-handoff when all rows are bun-test backed and plan has no Gherkin', () => {
    const handoffMd = [
      '| ID       | Done when | Evidence              |',
      '| -------- | --------- | --------------------- |',
      '| SF-1 AC1 | works     | `bun test foo`        |'
    ].join('\n')
    const planMd = 'Just src/ work, no features mentioned.'
    const subtasks = buildSubtaskManifest({
      featureDir: 'x',
      slug: 'x',
      handoffMd,
      planMd
    })
    expect(subtasks.find(s => s.type === 'gherkin-bdd-handoff')).toBeUndefined()
  })

  it('adds catalog-touch when plan mentions assets/catalog/catalog.yaml', () => {
    const subtasks = buildSubtaskManifest({
      featureDir: 'x',
      slug: 'x',
      handoffMd: '',
      planMd: 'Add new key in assets/catalog/catalog.yaml.'
    })
    expect(subtasks.find(s => s.type === 'catalog-touch')).toBeDefined()
  })
})

describe('renderManifestXml', () => {
  it('produces well-formed XML with expected element names', () => {
    const xml = renderManifestXml([
      {
        type: 'implement-src',
        provider: 'primary',
        description: 'desc with <special> & "chars"'
      }
    ])
    expect(xml).toContain('<tasks>')
    expect(xml).toContain('</tasks>')
    expect(xml).toContain('<task>')
    expect(xml).toContain('<type>implement-src</type>')
    expect(xml).toContain('<provider>primary</provider>')
    expect(xml).toContain('&lt;special&gt;')
    expect(xml).toContain('&amp;')
    expect(xml).toContain('&quot;')
  })
})

describe('parseArgs', () => {
  it('parses --feature and --next', () => {
    const args = parseArgs(['orchestrated-handoff', '--feature', 'x', '--next'])
    expect(args.workflowName).toBe('orchestrated-handoff')
    expect(args.featureDir).toBe('x')
    expect(args.next).toBe(true)
    expect(args.manifest).toBe(false)
  })

  it('parses --manifest', () => {
    const args = parseArgs(['orchestrated-handoff', '--feature', 'x', '--manifest'])
    expect(args.manifest).toBe(true)
  })

  it('defaults to --next when no action flag is passed', () => {
    const args = parseArgs(['orchestrated-handoff', '--feature', 'x'])
    expect(args.next).toBe(true)
    expect(args.manifest).toBe(false)
    expect(args.lint).toBe(false)
  })

  it('parses --lint', () => {
    const args = parseArgs(['orchestrated-handoff', '--feature', 'x', '--lint'])
    expect(args.lint).toBe(true)
    expect(args.next).toBe(false)
  })

  it('throws when --feature is missing', () => {
    expect(() => parseArgs(['orchestrated-handoff'])).toThrow()
  })
})

describe('runLint (OHW-6 AC1)', () => {
  it('delegates to lint.script.ts with --strict and feature dir', () => {
    const calls: string[][] = []
    const exit = runLint('assets/specs/foo-bar', {
      spawn: cmd => {
        calls.push(cmd)
        return { exitCode: 0 }
      }
    })
    expect(exit).toBe(0)
    expect(calls[0]).toEqual(['bun', 'tools/governance/specs/lint.script.ts', '--strict', 'assets/specs/foo-bar'])
  })

  it('propagates non-zero exit code from lint', () => {
    const exit = runLint('x', { spawn: () => ({ exitCode: 1 }) })
    expect(exit).toBe(1)
  })
})

describe('scanFeatureDir (A3 marker symmetry)', () => {
  it('reports implement complete only when checklists/implement-done.md exists', () => {
    const featureDir = PILOT_FEATURE_DIR
    const files = scanFeatureDir(featureDir)
    // 003 has no implement-done checklist yet → not complete.
    expect(files.implementComplete).toBe(false)
  })
})

describe('T1 regression — catalog handoff file does NOT satisfy gherkin gate', () => {
  // Background: an earlier bug treated `tmp/handoffs/opencode-{slug}-catalog.md`
  // (or `…-e2e-fix.md`) as a satisfying "handoff emitted" marker for the
  // gherkin gate. The fix renamed the FileSet field to `handoffEmittedGherkin`
  // and narrowed the file lookup to the `-gherkin.md` suffix only. This test
  // proves the narrowing by writing a catalog-focus file and asserting the
  // detector still routes to handoff-generate.

  let scratchRoot: string | null = null

  afterEach(() => {
    if (scratchRoot && existsSync(scratchRoot)) {
      rmSync(scratchRoot, { recursive: true, force: true })
    }
    scratchRoot = null
  })

  it('scanFeatureDir + detectPhase: catalog-only file → handoffEmittedGherkin=false → handoff-generate', () => {
    scratchRoot = mkdtempSync(path.join(tmpdir(), 'orchestrated-handoff-t1-'))
    const featureDir = path.join(scratchRoot, '099-catalog-only-fixture')
    const handoffsDir = path.join(scratchRoot, 'tmp-handoffs')
    const checklistsDir = path.join(featureDir, 'checklists')
    mkdirSync(checklistsDir, { recursive: true })
    mkdirSync(handoffsDir, { recursive: true })

    // Minimal feature dir: spec/plan/tasks/handoff + both analyze checklists,
    // implement NOT complete, so the detector reaches the handoff transition.
    writeFileSync(path.join(featureDir, 'spec.md'), '# spec\n')
    writeFileSync(path.join(featureDir, 'plan.md'), '# plan\n')
    writeFileSync(path.join(featureDir, 'tasks.md'), '# tasks\n')
    writeFileSync(path.join(featureDir, 'handoff.md'), '# handoff\n')
    writeFileSync(path.join(checklistsDir, 'analyze-plan.md'), 'done\n')
    writeFileSync(path.join(checklistsDir, 'analyze-tasks.md'), 'done\n')

    // Write only the catalog-focus handoff file — the gherkin file is absent.
    writeFileSync(path.join(handoffsDir, 'opencode-catalog-only-fixture-catalog.md'), '# catalog handoff body\n')

    const files = scanFeatureDir(featureDir, handoffsDir)
    expect(files.handoffEmittedGherkin).toBe(false)
    expect(files.implementComplete).toBe(false)

    const next = detectPhase(files, featureDir, () => true)
    expect(next.phase).toBe('handoff-generate')
    expect(next.command).toContain('--focus gherkin')
  })

  it('scanFeatureDir: only the gherkin-suffix file flips handoffEmittedGherkin', () => {
    scratchRoot = mkdtempSync(path.join(tmpdir(), 'orchestrated-handoff-t1b-'))
    const featureDir = path.join(scratchRoot, '099-gherkin-emitted')
    const handoffsDir = path.join(scratchRoot, 'tmp-handoffs')
    mkdirSync(featureDir, { recursive: true })
    mkdirSync(handoffsDir, { recursive: true })
    writeFileSync(path.join(handoffsDir, 'opencode-gherkin-emitted-gherkin.md'), 'ok\n')

    const files = scanFeatureDir(featureDir, handoffsDir)
    expect(files.handoffEmittedGherkin).toBe(true)
  })
})

describe('pilot 003 (real handoff.md + plan.md)', () => {
  it('manifest MUST include gherkin-bdd-handoff for the pilot', () => {
    const handoffPath = `${PILOT_FEATURE_DIR}/handoff.md`
    const planPath = `${PILOT_FEATURE_DIR}/plan.md`
    if (!existsSync(handoffPath) || !existsSync(planPath)) {
      throw new Error('pilot 003 handoff.md / plan.md missing')
    }
    const handoffMd = readFileSync(handoffPath, 'utf-8')
    const planMd = readFileSync(planPath, 'utf-8')
    const subtasks = buildSubtaskManifest({
      featureDir: PILOT_FEATURE_DIR,
      slug: 'sync-frecency-preserve',
      handoffMd,
      planMd
    })
    expect(subtasks.find(s => s.type === 'gherkin-bdd-handoff')).toBeDefined()
    expect(subtasks.find(s => s.type === 'implement-src')).toBeDefined()
  })
})
