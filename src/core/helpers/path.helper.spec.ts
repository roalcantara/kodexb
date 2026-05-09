import { describe, expect, it } from 'bun:test'
import { expandPath } from './path.helper'

const EXPAND_PATH_CASES = [
  ['expands ~ to HOME', '~/foo', '/Users/test/foo'],
  ['expands $VAR bare notation', '$MYDIR/bar', '/var/data/bar'],
  ['returns empty for empty string', '', ''],
  ['returns empty for whitespace', '   ', '']
] as const

describe('expandPath()', () => {
  const mockEnv = Object.fromEntries([
    ['HOME', '/Users/test'],
    ['MYDIR', '/var/data']
  ])

  describe.each(EXPAND_PATH_CASES)('%s', (_, input, expected) => {
    it(`returns "${expected}"`, () => {
      expect(expandPath(input, mockEnv)).toBe(expected)
    })
  })

  it('expands brace-style env var notation', () => {
    const braceVar = ['$', '{MYDIR}', '/bar'].join('')
    expect(expandPath(braceVar, mockEnv)).toBe('/var/data/bar')
  })

  it('uses defaultValue when input is empty', () => {
    expect(expandPath('', mockEnv, '~/default')).toBe('/Users/test/default')
  })

  it('returns empty string when input is non-string', () => {
    expect(expandPath(null, mockEnv)).toBe('')
    expect(expandPath(undefined, mockEnv)).toBe('')
  })
})
