import { describe, expect, it } from 'bun:test'
import { configureRendererLogging, rendererLoggingLowestLevelFromEnv } from './renderer.config'

function envRecord(entries: [string, string | undefined][]): Record<string, string | undefined> {
  return Object.fromEntries(entries)
}

describe('rendererLoggingLowestLevelFromEnv', () => {
  describe.each([
    { logLevel: undefined, expected: 'warning' as const },
    { logLevel: 'verbose', expected: 'info' as const },
    { logLevel: 'debug', expected: 'debug' as const },
    { logLevel: 'trace', expected: 'trace' as const },
    { logLevel: 'bananas', expected: 'warning' as const },
    { logLevel: 'DEBUG', expected: 'debug' as const }
  ])('when LOG_LEVEL is $logLevel', ({ logLevel, expected }) => {
    it(`maps to "${expected}"`, () => {
      const env =
        logLevel === undefined ? {} : envRecord([['LOG_LEVEL', logLevel]])
      expect(rendererLoggingLowestLevelFromEnv(env)).toBe(expected)
    })
  })
})

describe('configureRendererLogging', () => {
  describe('on first call', () => {
    it('does not throw', () => {
      expect(() => configureRendererLogging()).not.toThrow()
    })
  })

  describe('on subsequent calls', () => {
    it('does not throw (singleton guard)', () => {
      expect(() => configureRendererLogging()).not.toThrow()
    })
  })
})
