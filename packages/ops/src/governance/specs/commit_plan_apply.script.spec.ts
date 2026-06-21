import { describe, expect, it } from 'bun:test'
import path from 'node:path'
import { applyPhaseCommit } from './commit_plan_apply.script'

const FIXTURE_DIR = path.join(import.meta.dirname, '../../__tests__/fixtures/commit_plan')

describe('commit_plan_apply dry-run', () => {
  it('applyPhaseCommit dry-run prints staging without git write', () => {
    const root = process.cwd()
    const code = applyPhaseCommit({
      root,
      featureDir: FIXTURE_DIR,
      phaseId: 'C1',
      dryRun: true
    })
    expect(code).toBe(0)
  })

  it('applyPhaseCommit fails for unknown phase id', () => {
    const code = applyPhaseCommit({
      root: process.cwd(),
      featureDir: FIXTURE_DIR,
      phaseId: 'C99',
      dryRun: true
    })
    expect(code).toBe(1)
  })
})
