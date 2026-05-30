import { describe, expect, it } from 'bun:test'
import {
  isLogVerbosity,
  type LogtapeLevel,
  type LogVerbosity,
  lowestLogtapeLevelForVerbosity,
  parseLogVerbosity
} from './log_verbosity'

function envRecord(entries: [string, string | undefined][]): Record<string, string | undefined> {
  return Object.fromEntries(entries)
}

describe('parseLogVerbosity()', () => {
  describe('when LOG_LEVEL is absent or blank', () => {
    describe.each([
      ['missing env', {}],
      ['empty value', envRecord([['LOG_LEVEL', '']])],
      ['whitespace value', envRecord([['LOG_LEVEL', '   ']])]
    ])('with %s', (_, env) => {
      it('returns default', () => {
        expect(parseLogVerbosity(env)).toBe('default')
      })
    })
  })

  describe('when LOG_LEVEL is known', () => {
    const knownLevelCases = [
      ['VERBOSE', envRecord([['LOG_LEVEL', 'VERBOSE']]), 'verbose'],
      ['Debug with spaces', envRecord([['LOG_LEVEL', ' Debug ']]), 'debug'],
      ['trace', envRecord([['LOG_LEVEL', 'trace']]), 'trace']
    ] as const satisfies ReadonlyArray<readonly [string, Record<string, string | undefined>, LogVerbosity]>

    describe.each(knownLevelCases)('with %s', (_, env, expected) => {
      it('returns the verbosity', () => {
        expect(parseLogVerbosity(env)).toBe(expected)
      })
    })
  })

  describe('when LOG_LEVEL is unknown', () => {
    describe.each([
      ['yes', envRecord([['LOG_LEVEL', 'yes']])],
      ['info', envRecord([['LOG_LEVEL', 'info']])]
    ])('with %s', (_, env) => {
      it('returns default', () => {
        expect(parseLogVerbosity(env)).toBe('default')
      })
    })
  })
})

describe('lowestLogtapeLevelForVerbosity()', () => {
  const verbosityLevelCases = [
    ['default', 'warning'],
    ['verbose', 'info'],
    ['debug', 'debug'],
    ['trace', 'trace']
  ] as const satisfies ReadonlyArray<readonly [LogVerbosity, LogtapeLevel]>

  describe.each(verbosityLevelCases)('when verbosity is %s', (verbosity, expected) => {
    it('maps to the dial level', () => {
      expect(lowestLogtapeLevelForVerbosity(verbosity)).toBe(expected)
    })
  })
})

describe('isLogVerbosity()', () => {
  describe('when value is a verbosity', () => {
    it('returns true', () => {
      expect(isLogVerbosity('verbose')).toBe(true)
    })
  })

  describe('when value is not a verbosity', () => {
    it('returns false', () => {
      expect(isLogVerbosity('info')).toBe(false)
    })
  })
})
