import { afterEach, describe, expect, it } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { detectPhase, scanFeatureDir } from './orchestrated_handoff.script.ts'

describe('T1 regression — catalog handoff file does NOT satisfy gherkin gate', () => {
  let scratchRoot: string | null = null

  afterEach(() => {
    if (scratchRoot && existsSync(scratchRoot)) rmSync(scratchRoot, { recursive: true, force: true })
    scratchRoot = null
  })

  it('scanFeatureDir + detectPhase: catalog-only file → handoffEmittedGherkin=false → handoff-generate', () => {
    scratchRoot = mkdtempSync(path.join(tmpdir(), 'orchestrated-handoff-t1-'))
    const featureDir = path.join(scratchRoot, '099-catalog-only-fixture')
    const handoffsDir = path.join(scratchRoot, 'tmp-handoffs')
    const checklistsDir = path.join(featureDir, 'checklists')
    mkdirSync(checklistsDir, { recursive: true })
    mkdirSync(handoffsDir, { recursive: true })

    for (const [name, content] of [
      ['spec.md', '# spec\n'],
      ['plan.md', '# plan\n'],
      ['tasks.md', '# tasks\n'],
      ['handoff.md', '# handoff\n']
    ] as const) {
      writeFileSync(path.join(featureDir, name), content)
    }
    writeFileSync(path.join(checklistsDir, 'analyze-plan.md'), 'done\n')
    writeFileSync(path.join(checklistsDir, 'analyze-tasks.md'), 'done\n')
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
