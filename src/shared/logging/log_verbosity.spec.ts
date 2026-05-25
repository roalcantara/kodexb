import { describe, expect, it } from 'bun:test'
import { isLogVerbosity, parseLogVerbosity } from './log_verbosity'

function envRecord(entries: [string, string | undefined][]): Record<string, string | undefined> {
  return Object.fromEntries(entries)
}

describe('parseLogVerbosity', () => {
  it('empty or missing → default', () => {
    expect(parseLogVerbosity({})).toBe('default')
    expect(parseLogVerbosity(envRecord([['KB_LOG', '']]))).toBe('default')
    expect(parseLogVerbosity(envRecord([['KB_LOG', '   ']]))).toBe('default')
  })

  it('accepts known values case-insensitively', () => {
    expect(parseLogVerbosity(envRecord([['KB_LOG', 'VERBOSE']]))).toBe('verbose')
    expect(parseLogVerbosity(envRecord([['KB_LOG', ' Debug ']]))).toBe('debug')
    expect(parseLogVerbosity(envRecord([['KB_LOG', 'trace']]))).toBe('trace')
  })

  it('unknown value returns default', () => {
    expect(parseLogVerbosity(envRecord([['KB_LOG', 'yes']]))).toBe('default')
    expect(parseLogVerbosity(envRecord([['KB_LOG', 'info']]))).toBe('default')
  })
})

describe('isLogVerbosity', () => {
  it('narrows valid types', () => {
    expect(isLogVerbosity('verbose')).toBe(true)
    expect(isLogVerbosity('info')).toBe(false)
  })
})
