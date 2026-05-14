import { describe, expect, test } from 'bun:test'
import { isKbLogVerbosity, parseKbLogVerbosity } from './kb_log_verbosity'

describe('parseKbLogVerbosity', () => {
  test('empty or missing → default', () => {
    expect(parseKbLogVerbosity({})).toBe('default')
    expect(parseKbLogVerbosity({ KB_LOG: '' })).toBe('default')
    expect(parseKbLogVerbosity({ KB_LOG: '   ' })).toBe('default')
  })

  test('accepts known values case-insensitively', () => {
    expect(parseKbLogVerbosity({ KB_LOG: 'VERBOSE' })).toBe('verbose')
    expect(parseKbLogVerbosity({ KB_LOG: ' Debug ' })).toBe('debug')
    expect(parseKbLogVerbosity({ KB_LOG: 'trace' })).toBe('trace')
  })

  test('invalid → default', () => {
    expect(parseKbLogVerbosity({ KB_LOG: 'yes' })).toBe('default')
    expect(parseKbLogVerbosity({ KB_LOG: 'info' })).toBe('default')
  })
})

describe('isKbLogVerbosity', () => {
  test('narrows type', () => {
    expect(isKbLogVerbosity('verbose')).toBe(true)
    expect(isKbLogVerbosity('info')).toBe(false)
  })
})
