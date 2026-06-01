import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { lowestLogtapeLevelForVerbosity, parseLogVerbosity } from './log_verbosity'

function getEffectiveLevel(): string {
  return lowestLogtapeLevelForVerbosity(parseLogVerbosity())
}

let originalEnv: NodeJS.ProcessEnv

describe('configureMainLogging', () => {
  describe('level derivation from LOG_LEVEL', () => {
    beforeEach(() => {
      originalEnv = { ...process.env }
    })
    afterEach(() => {
      process.env = originalEnv
    })

    describe.each([
      { logLevel: undefined, expected: 'warning' },
      { logLevel: 'verbose', expected: 'info' },
      { logLevel: 'debug', expected: 'debug' },
      { logLevel: 'trace', expected: 'trace' },
      { logLevel: 'bananas', expected: 'warning' },
      { logLevel: 'DEBUG', expected: 'debug' }
    ])('when LOG_LEVEL is "%s"', ({ logLevel, expected }) => {
      it(`derives "${expected}"`, () => {
        if (logLevel === undefined) {
          delete process.env.LOG_LEVEL
        } else {
          process.env.LOG_LEVEL = logLevel
        }
        expect(getEffectiveLevel()).toBe(expected)
      })
    })
  })

  describe('calling the function', () => {
    beforeEach(() => {
      originalEnv = { ...process.env }
      delete process.env.LOG_LEVEL
    })
    afterEach(() => {
      process.env = originalEnv
    })

    describe('when called', async () => {
      const { configureMainLogging } = await import('./main.config')
      it('does not throw on first call', () => {
        expect(() => configureMainLogging()).not.toThrow()
      })
      it('does not throw on second call (idempotent)', () => {
        expect(() => configureMainLogging()).not.toThrow()
      })
    })

    describe.each([
      ['LOG_LEVEL=verbose', 'verbose'],
      ['LOG_LEVEL=debug', 'debug'],
      ['LOG_LEVEL=trace', 'trace'],
      ['unknown LOG_LEVEL', 'garbage_value']
    ])('when LOG_LEVEL is "%s"', (_desc, logLevel) => {
      process.env.LOG_LEVEL = logLevel
      it(`handles "${logLevel}" without throwing`, async () => {
        const { configureMainLogging } = await import('./main.config')
        expect(() => configureMainLogging()).not.toThrow()
      })
    })
  })
})
