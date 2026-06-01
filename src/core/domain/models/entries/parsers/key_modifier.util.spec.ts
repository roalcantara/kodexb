import { describe, expect, it } from 'bun:test'
import type { KeyModifier } from '@core/domain/constants'
import { factoryFor } from '@testing'
import type { AuthoringChordStep } from './chord.parser'
import { isHyperDisplayChord, normalizeChordSteps, resolveModifierToken, sortKeyModifiers } from './key_modifier.util'

describe('resolveModifierToken()', () => {
  describe.each([
    ['opt', 'alt'],
    ['command', 'cmd'],
    ['super', 'super'],
    ['hyper', 'hyper']
  ] as const)('when token is %s', (token, expected) => {
    it('returns canonical modifier', () => {
      expect(resolveModifierToken(token)).toBe(expected)
    })
  })
})

describe('normalizeChordSteps()', () => {
  describe.each([
    ['hyper on macOS', [factoryFor('authoringChordStep:hyperMac')], 'macos', ['ctrl', 'alt', 'cmd'] as KeyModifier[]],
    [
      'hyper on Linux',
      [factoryFor('authoringChordStep:hyperLinux')],
      'linux',
      ['ctrl', 'alt', 'super'] as KeyModifier[]
    ],
    ['super on Linux', [factoryFor('authoringChordStep:superTab')], 'linux', ['super'] as KeyModifier[]]
  ] as const)('when chord is %s', (_, steps, platform, expectedModifiers) => {
    it('expands modifiers', () => {
      expect(normalizeChordSteps(steps as unknown as AuthoringChordStep[], platform)[0]?.modifiers).toEqual(
        expectedModifiers
      )
    })
  })
})

describe('isHyperDisplayChord()', () => {
  describe('when modifiers match hyper triple', () => {
    describe.each([
      ['macOS triple', factoryFor('keyModifierSet:hyperMac').modifiers, 'macos'],
      [
        'macOS triple with shift',
        factoryFor('keyModifierSet', { overrides: { modifiers: ['ctrl', 'alt', 'cmd', 'shift'] } }).modifiers,
        'macos'
      ],
      ['Linux triple with super', factoryFor('keyModifierSet:hyperLinux').modifiers, 'linux']
    ] as const)('with %s', (_, modifiers, platform) => {
      it('returns true', () => {
        expect(isHyperDisplayChord(modifiers as unknown as KeyModifier[], platform)).toBe(true)
      })
    })
  })
})

describe('sortKeyModifiers()', () => {
  it('orders by precedence', () => {
    expect(sortKeyModifiers(['shift', 'cmd', 'ctrl', 'alt'])).toEqual(['ctrl', 'alt', 'cmd', 'shift'])
  })
})
