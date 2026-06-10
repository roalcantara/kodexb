import { describe, expect, it } from 'bun:test'
import { orchestratedRunProviders } from './orchestrator_providers.script.ts'

describe('orchestrator_providers', () => {
  it('exports orchestratedRunProviders', () => {
    expect(typeof orchestratedRunProviders).toBe('function')
  })
})
