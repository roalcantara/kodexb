import { describe, expect, it } from 'bun:test'
import { lowestLevelForVerbosity } from './logtape.adapter'

describe('lowestLevelForVerbosity', () => {
  it('maps verbosity to Logtape level', () => {
    expect(lowestLevelForVerbosity('default')).toBe('warning')
    expect(lowestLevelForVerbosity('verbose')).toBe('info')
    expect(lowestLevelForVerbosity('debug')).toBe('debug')
    expect(lowestLevelForVerbosity('trace')).toBe('trace')
  })
})
