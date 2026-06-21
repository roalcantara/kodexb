import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { resolveTerminalAppName } from './app.resolver'

describe('resolveTerminalAppName()', () => {
  describe('when terminalApp is set', () => {
    const cases = [
      { app: 'iTerm', want: 'iTerm' },
      { app: 'Ghostty', want: 'Ghostty' },
      { app: 'Warp', want: 'Warp' },
      { app: 'Terminal', want: 'Terminal' }
    ]

    for (const { app, want } of cases) {
      it(`returns "${want}"`, () => {
        expect(resolveTerminalAppName(app)).toBe(want)
      })
    }
  })

  describe('when terminalApp is empty string', () => {
    it('is treated as unset and falls through to platform logic (returns "Terminal" on darwin)', () => {
      expect(resolveTerminalAppName('', 'darwin')).toBe('Terminal')
    })
  })

  describe('when terminalApp is unset', () => {
    describe('on darwin', () => {
      it('returns "Terminal"', () => {
        expect(resolveTerminalAppName(undefined, 'darwin')).toBe('Terminal')
      })
    })

    describe('on linux', () => {
      let origTerminal: string | undefined

      beforeEach(() => {
        origTerminal = process.env.TERMINAL
      })
      afterEach(() => {
        process.env.TERMINAL = origTerminal
      })

      it('returns the value of $TERMINAL when set', () => {
        process.env.TERMINAL = 'foot'
        // linux + env.TERMINAL=foot → 'foot'
        expect(resolveTerminalAppName(undefined, 'linux', { TERMINAL: 'foot' })).toBe('foot')
      })

      it('returns "x-terminal-emulator" when $TERMINAL is unset', () => {
        expect(resolveTerminalAppName(undefined, 'linux', {})).toBe('x-terminal-emulator')
      })
    })
  })
})
