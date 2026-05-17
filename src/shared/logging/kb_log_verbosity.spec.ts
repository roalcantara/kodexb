import { describe, expect, it } from 'bun:test'
import { isKbLogVerbosity, parseKbLogVerbosity } from './kb_log_verbosity'

function envRecord(entries: [string, string | undefined][]): Record<string, string | undefined> {
  return Object.fromEntries(entries)
}

describe('parseKbLogVerbosity', () => {
  it('empty or missing → default', () => {
    expect(parseKbLogVerbosity({})).toBe('default')
    expect(parseKbLogVerbosity(envRecord([['KB_LOG', '']]))).toBe('default')
    expect(parseKbLogVerbosity(envRecord([['KB_LOG', '   ']]))).toBe('default')
  })

  it('accepts known values case-insensitively', () => {
    expect(parseKbLogVerbosity(envRecord([['KB_LOG', 'VERBOSE']]))).toBe('verbose')
    expect(parseKbLogVerbosity(envRecord([['KB_LOG', ' Debug ']]))).toBe('debug')
    expect(parseKbLogVerbosity(envRecord([['KB_LOG', 'trace']]))).toBe('trace')
  })

  it('unknown value returns default', () => {
    expect(parseKbLogVerbosity(envRecord([['KB_LOG', 'yes']]))).toBe('default')
    expect(parseKbLogVerbosity(envRecord([['KB_LOG', 'info']]))).toBe('default')
  })
})

describe('isKbLogVerbosity', () => {
  it('narrows valid types', () => {
    expect(isKbLogVerbosity('verbose')).toBe(true)
    expect(isKbLogVerbosity('info')).toBe(false)
  })
})
