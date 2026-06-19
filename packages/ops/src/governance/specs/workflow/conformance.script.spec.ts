import { describe, expect, it } from 'bun:test'
import path from 'node:path'
import { loadProfile } from '@kb/exec'

const DEFAULT_PROFILE_PATH = path.resolve('assets/catalog/workflows/default.yaml')
const DETECT_PHASE_ORDER = [
  'specify',
  'plan',
  'analyze-plan',
  'tasks',
  'analyze-tasks',
  'handoff-generate',
  'implement',
  'pr-prep',
  'review',
  'gate',
  'pr-open',
  'pr-check'
]

describe('Layer-B conformance: default.yaml matches detectPhase() order (AWO-12.1)', () => {
  it('loads the default profile', () => {
    const profile = loadProfile(DEFAULT_PROFILE_PATH)
    expect(profile.name).toBe('default')
  })

  it('stage ids in default.yaml include detectPhase() order as a subsequence', () => {
    const profile = loadProfile(DEFAULT_PROFILE_PATH)
    const stageIds = profile.stages.map(s => s.id)

    let cursor = 0
    for (const expectedPhase of DETECT_PHASE_ORDER) {
      const idx = stageIds.indexOf(expectedPhase, cursor)
      expect(idx).not.toBe(-1)
      cursor = idx + 1
    }
  })
})
