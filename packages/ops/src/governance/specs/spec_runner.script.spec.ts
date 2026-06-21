import { describe, expect, it } from 'bun:test'
import { catalogPaths } from '../support/catalog_paths.script'
import { buildSpecRunnerSteps, specGateSteps, specReadySteps } from './spec_runner.script'

const FEAT = `${catalogPaths.specs_root}/011-mise-sdd-cli`
const ROOT = process.cwd()

describe('specGateSteps', () => {
  it('returns a single gate step', () => {
    const steps = specGateSteps(FEAT, ROOT)
    expect(steps.map(s => s.id)).toEqual(['gate'])
    expect(steps[0]?.title).toContain('spec gate')
    expect(typeof steps[0]?.run).toBe('function')
  })
})

describe('specReadySteps', () => {
  it('without catalog key omits tag step', () => {
    expect(specReadySteps(FEAT, ROOT).map(s => s.id)).toEqual(['catalog', 'hk', 'gate'])
  })

  it('with catalog key prepends tag step and appends promote', () => {
    expect(specReadySteps(FEAT, ROOT, { catalogKey: 'mise_sdd_cli' }).map(s => s.id)).toEqual([
      'tag',
      'catalog',
      'hk',
      'gate',
      'promote'
    ])
  })

  it('every step has a run closure', () => {
    for (const step of specReadySteps(FEAT, ROOT, { catalogKey: 'demo' })) {
      expect(typeof step.run).toBe('function')
    }
  })
})

describe('buildSpecRunnerSteps', () => {
  it('spec-gate plan yields one step', () => {
    const steps = buildSpecRunnerSteps(
      { kind: 'runner', task: 'spec-gate', featureDir: FEAT, json: false, raw: false },
      ROOT
    )
    expect(steps).toHaveLength(1)
    expect(steps[0]?.id).toBe('gate')
  })

  it('spec-ready plan includes catalog hk and gate', () => {
    const steps = buildSpecRunnerSteps(
      { kind: 'runner', task: 'spec-ready', featureDir: FEAT, json: false, raw: false },
      ROOT
    )
    const ids = steps.map(s => s.id)
    expect(ids).toContain('catalog')
    expect(ids).toContain('hk')
    expect(ids).toContain('gate')
  })

  it('spec-closeout prepends audit and evidence before ready steps', () => {
    const steps = buildSpecRunnerSteps(
      { kind: 'runner', task: 'spec-closeout', featureDir: FEAT, json: false, raw: false },
      ROOT
    )
    const ids = steps.map(s => s.id)
    expect(ids.slice(0, 2)).toEqual(['audit', 'evidence'])
    expect(ids).toContain('gate')
  })
})
