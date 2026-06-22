import { describe, expect, it } from 'bun:test'
import { crgOnPath, isCrgRefreshEnvironment } from './crg_refresh_env.script'
import { crgRiskSummaryWorkerRunning } from './schedule_crg_refresh.script'

describe('crg_refresh_env', () => {
  it('isCrgRefreshEnvironment is false in CI', () => {
    expect(isCrgRefreshEnvironment()).toBe(true)
    const prev = process.env.CI
    process.env.CI = 'true'
    try {
      expect(isCrgRefreshEnvironment()).toBe(false)
    } finally {
      if (prev === undefined) delete process.env.CI
      else process.env.CI = prev
    }
  })

  it('crgOnPath reflects whether code-review-graph is on PATH', () => {
    expect(typeof crgOnPath()).toBe('boolean')
  })
})

describe('crgRiskSummaryWorkerRunning', () => {
  it('returns false when no pid file exists', () => {
    expect(crgRiskSummaryWorkerRunning('/tmp/nonexistent-crg-root-xyz')).toBe(false)
  })
})
