import { describe, expect, it } from 'bun:test'
import { parseChord } from './chord.parser'
import { normalizeChordSteps } from './key_modifier.util'

describe('parseChord()', () => {
  describe('with a single-step chord', () => {
    describe.each([
      { input: 'cmd+p', modifiers: ['cmd'], key: 'p' },
      { input: 'cmd+shift+p', modifiers: ['cmd', 'shift'], key: 'p' },
      { input: 'opt+cmd+t', modifiers: ['alt', 'cmd'], key: 't' },
      { input: 'super+tab', modifiers: ['super'], key: 'tab' },
      { input: 'windows+d', modifiers: ['windows'], key: 'd' },
      { input: 'cmd+backslash', modifiers: ['cmd'], key: 'backslash' },
      { input: 'cmd+arrowUp', modifiers: ['cmd'], key: 'arrowUp' },
      { input: 'meta+p', modifiers: ['cmd'], key: 'p' },
      { input: 'command+shift+p', modifiers: ['cmd', 'shift'], key: 'p' }
    ])('when input is $input', ({ input, modifiers, key }) => {
      it('returns parsed step', () => {
        const result = parseChord(input)
        expect(result.isOk()).toBe(true)
        if (result.isOk()) {
          expect(result.value[0]?.modifiers).toEqual([...modifiers])
          expect(result.value[0]?.key).toBe(key)
        }
      })
    })

    describe('when input uses hyper authoring', () => {
      it('keeps hyper until normalized', () => {
        const result = parseChord('hyper+shift+k')
        expect(result.isOk()).toBe(true)
        if (result.isOk()) {
          expect(result.value[0]?.modifiers).toEqual(['hyper', 'shift'])
        }
      })

      it('expands hyper on Linux', () => {
        const parsed = parseChord('hyper+1')
        expect(parsed.isOk()).toBe(true)
        if (parsed.isOk()) {
          expect(normalizeChordSteps(parsed.value, 'linux')[0]?.modifiers).toEqual(['ctrl', 'alt', 'super'])
        }
      })
    })
  })

  describe('with a multi-step chord', () => {
    it('returns all steps', () => {
      const result = parseChord('cmd+k cmd+s')
      expect(result.isOk()).toBe(true)
      if (result.isOk()) {
        expect(result.value).toEqual([
          { modifiers: ['cmd'], key: 'k' },
          { modifiers: ['cmd'], key: 's' }
        ])
      }
    })
  })

  describe('with rejected legacy key tokens', () => {
    describe.each(['ctrl+up', 'cmd+escape', 'cmd+arrowup', 'cmd+↑'])('when input is %s', input => {
      it('returns an error', () => {
        const result = parseChord(input)
        expect(result.isErr()).toBe(true)
      })
    })
  })

  describe('with banned authoring forms', () => {
    describe.each([
      { input: '', message: 'Empty chord string' },
      { input: '⌘P', message: 'Modifier glyphs' },
      { input: 'foo+p', message: 'Unknown modifier or key' }
    ])('when input is $input', ({ input, message }) => {
      it('returns an error', () => {
        const result = parseChord(input)
        expect(result.isErr()).toBe(true)
        if (result.isErr()) {
          expect(result.error.message).toContain(message)
        }
      })
    })
  })
})
