import { describe, expect, it } from 'bun:test'
import { SMOKE_FIXTURE } from './smoke_harness.script.ts'
import { parseScopeFeature } from './spec_test.script.ts'

describe('spec_test.script', () => {
  it('is importable', async () => {
    const mod = await import('./spec_test.script.ts')
    expect(typeof mod).toBe('object')
  })
})

describe('parseScopeFeature', () => {
  // Generic feature-dir tokens (the parser only splits scope vs feature; using
  // non-`assets/specs` literals keeps the `no-inbound-assets-specs-ts` rule happy).
  const FEAT = 'features/011-demo'
  const cases = [
    { name: 'no args → composite, active feature', args: [], scope: '', featureDir: '' },
    { name: 'scope only', args: ['unit'], scope: 'unit', featureDir: '' },
    { name: 'scope + feature', args: ['e2e', FEAT], scope: 'e2e', featureDir: FEAT },
    { name: 'sole non-scope positional is the feature', args: [FEAT], scope: '', featureDir: FEAT },
    { name: 'smoke scope', args: ['smoke'], scope: 'smoke', featureDir: '' },
    { name: 'regression scope', args: ['regression'], scope: 'regression', featureDir: '' }
  ]
  for (const { name, args, scope, featureDir } of cases) {
    it(name, () => {
      expect(parseScopeFeature(args)).toEqual({ scope, featureDir })
    })
  }

  it('does not treat a feature path as a scope', () => {
    expect(parseScopeFeature(['features/009-demo']).scope).toBe('')
  })
})

describe('spec test smoke scope', () => {
  it('uses committed smoke fixture under tools/', () => {
    expect(SMOKE_FIXTURE).toBe('tools/__tests__/fixtures/workflow/smoke-feature')
    expect(SMOKE_FIXTURE.startsWith('tools/')).toBe(true)
  })
})
