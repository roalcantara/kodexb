import { describe, expect, it } from 'bun:test'
import { isLogVerbosity, lowestLogtapeLevelForVerbosity, parseLogVerbosity } from './log_verbosity'

function envRecord(entries: [string, string | undefined][]): Record<string, string | undefined> {
  return Object.fromEntries(entries)
}

describe('parseLogVerbosity', () => {
  it('empty or missing → default', () => {
    expect(parseLogVerbosity({})).toBe('default')
    expect(parseLogVerbosity(envRecord([['LOG_LEVEL', '']]))).toBe('default')
    expect(parseLogVerbosity(envRecord([['LOG_LEVEL', '   ']]))).toBe('default')
  })

  it('accepts known values case-insensitively', () => {
    expect(parseLogVerbosity(envRecord([['LOG_LEVEL', 'VERBOSE']]))).toBe('verbose')
    expect(parseLogVerbosity(envRecord([['LOG_LEVEL', ' Debug ']]))).toBe('debug')
    expect(parseLogVerbosity(envRecord([['LOG_LEVEL', 'trace']]))).toBe('trace')
  })

  it('unknown value returns default', () => {
    expect(parseLogVerbosity(envRecord([['LOG_LEVEL', 'yes']]))).toBe('default')
    expect(parseLogVerbosity(envRecord([['LOG_LEVEL', 'info']]))).toBe('default')
  })
})

describe('lowestLogtapeLevelForVerbosity', () => {
  it('maps each verbosity to the main/renderer dial', () => {
    expect(lowestLogtapeLevelForVerbosity('default')).toBe('warning')
    expect(lowestLogtapeLevelForVerbosity('verbose')).toBe('info')
    expect(lowestLogtapeLevelForVerbosity('debug')).toBe('debug')
    expect(lowestLogtapeLevelForVerbosity('trace')).toBe('trace')
  })
})

describe('isLogVerbosity', () => {
  it('narrows valid types', () => {
    expect(isLogVerbosity('verbose')).toBe(true)
    expect(isLogVerbosity('info')).toBe(false)
  })
})
