import { describe, expect, it } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
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
} from './orchestrated_handoff.script'

/** Generic feature-dir token for phase tests (avoids hardcoding assets/specs/*). */
const FEAT_011 = 'features/011-mise-sdd-cli'

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
  describe.each([
    {
      label: 'no spec.md → speckit.specify',
      files: makeFiles({ spec: false }),
      phase: 'specify',
      commandPart: 'speckit.specify'
    },
    {
      label: 'spec.md without plan.md → speckit.plan with lint hint',
      files: makeFiles({ plan: false }),
      phase: 'plan',
      commandPart: 'speckit.plan',
      hintPart: '--strict'
    },
    {
      label: 'plan.md without analyze-plan checklist → speckit.analyze with plan-pass hint',
      files: makeFiles({ analyzePlanChecklist: false }),
      phase: 'analyze-plan',
      commandPart: 'speckit.analyze',
      hintPart: 'plan.md traceability'
    },
    {
      label: 'analyze-plan done but no tasks.md → speckit.tasks',
      files: makeFiles({ tasks: false }),
      phase: 'tasks',
      commandPart: 'speckit.tasks'
    },
    {
      label: 'A2: tasks.md without handoff.md → speckit.tasks (do not skip ahead)',
      files: makeFiles({ handoff: false, analyzeTasksChecklist: false, handoffEmittedGherkin: false }),
      phase: 'tasks',
      commandPart: 'speckit.tasks',
      hintPart: 'handoff.md'
    },
    {
      label: 'tasks + handoff without analyze-tasks checklist → speckit.analyze with tasks-pass hint',
      files: makeFiles({ analyzeTasksChecklist: false }),
      phase: 'analyze-tasks',
      commandPart: 'speckit.analyze',
      hintPart: 'tasks.md + handoff.md Evidence'
    }
  ])('$label', ({ files, phase, commandPart, hintPart }) => {
    it('returns expected transition', () => {
      const r = detectPhase(files)
      expect(r.phase).toBe(phase)
      expect(r.command).toContain(commandPart)
      if (hintPart) expect(r.focusHint).toContain(hintPart)
    })
  })

  describe.each([
    {
      label: 'A1: analyze-tasks done + manifest NEEDS handoff → handoff-generate',
      featureDir: 'packages/ops/src/__tests__/fixtures/003-sync-frecency-preserve',
      needsHandoff: true,
      expectedPhase: 'handoff-generate',
      expectedCommandPart: 'mise run spec workflow handoff generate'
    },
    {
      label: 'A1: analyze-tasks done + manifest does NOT need handoff → speckit.implement',
      featureDir: 'packages/ops/src/__tests__/fixtures/006-unit-only-feature',
      needsHandoff: false,
      expectedPhase: 'implement',
      expectedCommandPart: 'speckit.implement'
    }
  ])('$label', ({ featureDir, needsHandoff, expectedPhase, expectedCommandPart }) => {
    it('returns expected transition', () => {
      const r = detectPhase(
        makeFiles({ handoffEmittedGherkin: false, implementComplete: false }),
        featureDir,
        () => needsHandoff
      )
      expect(r.phase).toBe(expectedPhase)
      expect(r.command).toContain(expectedCommandPart)
      if (needsHandoff) {
        expect(r.command).toContain('--focus gherkin')
        expect(r.command).toContain('003-sync-frecency-preserve')
      }
    })
  })

  describe.each([
    {
      label: 'A1: no gherkin handoff + implement-done → mise run spec gate',
      files: makeFiles({ handoffEmittedGherkin: false, implementComplete: true }),
      featureDir: FEAT_011,
      phase: 'gate',
      commandPart: 'mise run spec gate'
    },
    {
      label: 'handoff emitted, implement not complete → speckit.implement',
      files: makeFiles({ implementComplete: false }),
      featureDir: undefined,
      phase: 'implement',
      commandPart: 'speckit.implement'
    },
    {
      label: 'A3: implement-done checklist marker → mise run spec gate',
      files: makeFiles(),
      featureDir: 'packages/ops/src/__tests__/fixtures/003-sync-frecency-preserve',
      phase: 'gate',
      commandPart: 'mise run spec gate'
    }
  ])('$label', ({ files, featureDir, phase, commandPart }) => {
    it('returns final transition', () => {
      const probe = files.handoffEmittedGherkin === false && files.implementComplete === true ? () => false : () => true
      const r = featureDir ? detectPhase(files, featureDir, probe) : detectPhase(files)
      expect(r.phase).toBe(phase)
      expect(r.command).toContain(commandPart)
      if (featureDir) expect(r.command).toContain(featureDir.split('/').pop() ?? featureDir)
    })
  })
})

describe('buildSubtaskManifest', () => {
  it('always includes implement-src', () => {
    const subtasks = buildSubtaskManifest({ featureDir: 'x', slug: 'x', handoffMd: '', planMd: null })
    expect(subtasks[0]?.type).toBe('implement-src')
    expect(subtasks[0]?.provider).toBe('primary')
  })

  describe.each([
    {
      label: 'adds gherkin-bdd-handoff when handoff has an operator-smoke row',
      input: {
        featureDir: 'packages/ops/src/__tests__/fixtures/003-x',
        slug: 'sync-frecency-preserve',
        handoffMd: [
          '| ID       | Done when    | Evidence                                 |',
          '| -------- | ------------ | ---------------------------------------- |',
          '| SF-3 AC3 | UI one sync  | Operator smoke below — pending human run |'
        ].join('\n'),
        planMd: null
      },
      gherkinExpected: true,
      descriptionPart: 'tmp/handoffs/opencode-sync-frecency-preserve-gherkin.md'
    },
    {
      label: 'adds gherkin-bdd-handoff when plan mentions assets/features/',
      input: {
        featureDir: 'x',
        slug: 'x',
        handoffMd: [
          '| ID       | Done when | Evidence            |',
          '| -------- | --------- | ------------------- |',
          '| SF-1 AC1 | works     | `bun test path`     |'
        ].join('\n'),
        planMd: 'Plan refers to assets/features/foo.feature in section X.'
      },
      gherkinExpected: true
    },
    {
      label: 'omits gherkin-bdd-handoff when all rows are bun-test backed and plan has no Gherkin',
      input: {
        featureDir: 'x',
        slug: 'x',
        handoffMd: [
          '| ID       | Done when | Evidence              |',
          '| -------- | --------- | --------------------- |',
          '| SF-1 AC1 | works     | `bun test foo`        |'
        ].join('\n'),
        planMd: 'Just src/ work, no features mentioned.'
      },
      gherkinExpected: false
    },
    {
      label: 'adds catalog-touch when plan mentions assets/catalog/catalog.yaml',
      input: { featureDir: 'x', slug: 'x', handoffMd: '', planMd: 'Add new key in assets/catalog/catalog.yaml.' },
      catalogExpected: true
    }
  ])('$label', ({ input, gherkinExpected, descriptionPart, catalogExpected }) => {
    it('builds expected subtasks', () => {
      const subtasks = buildSubtaskManifest(input)
      const gherkin = subtasks.find(s => s.type === 'gherkin-bdd-handoff')
      if (gherkinExpected === true) expect(gherkin).toBeDefined()
      if (gherkinExpected === false) expect(gherkin).toBeUndefined()
      if (descriptionPart) {
        expect(gherkin?.provider).toBe('opencode')
        expect(gherkin?.description).toContain(descriptionPart)
      }
      if (catalogExpected) expect(subtasks.find(s => s.type === 'catalog-touch')).toBeDefined()
    })
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
  describe.each([
    {
      label: 'parses --feature and --next',
      argv: ['orchestrated-handoff', '--feature', 'x', '--next'],
      expected: {
        workflowName: 'orchestrated-handoff',
        featureDir: 'x',
        next: true,
        manifest: false
      }
    },
    {
      label: 'parses --manifest',
      argv: ['orchestrated-handoff', '--feature', 'x', '--manifest'],
      expected: { manifest: true }
    },
    {
      label: 'defaults to --next when no action flag is passed',
      argv: ['orchestrated-handoff', '--feature', 'x'],
      expected: { next: true, manifest: false, lint: false }
    },
    {
      label: 'parses --lint',
      argv: ['orchestrated-handoff', '--feature', 'x', '--lint'],
      expected: { lint: true, next: false }
    }
  ])('$label', ({ argv, expected }) => {
    it('parses arguments', () => {
      const args = parseArgs([...argv])
      expect(args).toEqual(expect.objectContaining(expected))
    })
  })

  it('throws when --feature is missing', () => {
    expect(() => parseArgs(['orchestrated-handoff'])).toThrow()
  })
})

describe('runLint (OHW-6 AC1)', () => {
  describe.each([
    {
      label: 'delegates with strict feature args',
      featureDir: 'packages/ops/src/__tests__/fixtures/foo-bar',
      exitCode: 0
    },
    { label: 'propagates non-zero exit code', featureDir: 'x', exitCode: 1 }
  ])('$label', ({ featureDir, exitCode }) => {
    it('runs lint and returns exit code', () => {
      const calls: string[][] = []
      const exit = runLint(featureDir, {
        spawn: cmd => {
          calls.push(cmd)
          return { exitCode }
        }
      })
      expect(exit).toBe(exitCode)
      if (featureDir === 'packages/ops/src/__tests__/fixtures/foo-bar') {
        expect(calls[0]).toEqual(['bun', 'packages/ops/src/governance/specs/lint.script.ts', '--strict', featureDir])
      }
    })
  })
})

describe('scanFeatureDir (A3 marker symmetry)', () => {
  it('reports implement complete only when checklists/implement-done.md exists', () => {
    const featureDir = mkdtempSync(path.join(tmpdir(), 'scan-feature-dir-fixture-'))
    mkdirSync(path.join(featureDir, 'checklists'), { recursive: true })
    writeFileSync(path.join(featureDir, 'spec.md'), '# spec\n')
    writeFileSync(path.join(featureDir, 'plan.md'), '# plan\n')
    writeFileSync(path.join(featureDir, 'tasks.md'), '# tasks\n')
    writeFileSync(path.join(featureDir, 'handoff.md'), '# handoff\n')
    const files = scanFeatureDir(featureDir)
    rmSync(featureDir, { recursive: true, force: true })
    expect(files.implementComplete).toBe(false)
  })
})
