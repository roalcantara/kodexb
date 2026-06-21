import { describe, expect, it } from 'bun:test'
import { resolveUsageCmd } from './dispatch.script'

describe('resolveUsageCmd', () => {
  it('returns usageCmd when set', () => {
    expect(resolveUsageCmd({ usage_cmd: 'list' }, [])).toBe('list')
  })

  it('returns first argv token when usage_cmd empty', () => {
    expect(resolveUsageCmd({}, ['list', '--flag'])).toBe('list')
  })

  it('skips dropTokens', () => {
    expect(resolveUsageCmd({}, ['skill', 'list'], { dropTokens: ['skill'] })).toBe('list')
  })

  it('returns empty string when both are empty', () => {
    expect(resolveUsageCmd({}, [])).toBe('')
  })
})
