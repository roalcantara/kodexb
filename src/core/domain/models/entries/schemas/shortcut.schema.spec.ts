import { describe, expect, it } from 'bun:test'
import type { TSchema } from '@sinclair/typebox'
import { Value } from '@sinclair/typebox/value'
import { authoringChordStepSchema, bindingSchema, chordStepSchema, shortcutEntrySchema } from './shortcut.schema'

function isValid(schema: Parameters<typeof Value.Check>[0], data: unknown): boolean {
  return Value.Check(schema, data) === true
}

function describePassesValidation(schema: TSchema, cases: readonly (readonly [string, object])[]): void {
  describe.each(cases)('with %s', (_, data) => {
    it('passes validation', () => {
      expect(isValid(schema, data)).toBe(true)
    })
  })
}

function describeFailsValidation(schema: TSchema, cases: readonly (readonly [string, object])[]): void {
  describe.each(cases)('with %s', (_, data) => {
    it('fails validation', () => {
      expect(isValid(schema, data)).toBe(false)
    })
  })
}

const sharedValidChordSteps = [
  ['single key with no modifiers', { key: 'a' }],
  ['named arrow key', { key: 'arrowUp' }],
  ['named backslash key', { key: 'backslash' }],
  ['ctrl and alt modifiers', { modifiers: ['ctrl', 'alt'], key: 'delete' }]
] as const

describe('authoringChordStepSchema', () => {
  describe('when the step is valid', () => {
    describePassesValidation(authoringChordStepSchema, [
      ...sharedValidChordSteps,
      ['hyper authoring token', { modifiers: ['hyper'], key: 'c' }],
      ['hyper with shift', { modifiers: ['hyper', 'shift'], key: 'k' }]
    ])
  })

  describe('when the step is invalid', () => {
    describeFailsValidation(authoringChordStepSchema, [
      ['duplicate modifiers', { modifiers: ['ctrl', 'ctrl'], key: 'c' }],
      ['legacy meta modifier', { modifiers: ['meta'], key: 'c' }],
      ['unknown key', { key: 'not-a-key' }],
      ['legacy escape token', { key: 'escape' }],
      ['legacy up token', { key: 'up' }]
    ])
  })
})

describe('chordStepSchema', () => {
  describe('when the step is valid', () => {
    describePassesValidation(chordStepSchema, [
      ...sharedValidChordSteps,
      ['function key', { key: 'f12' }],
      ['super modifier', { modifiers: ['super'], key: 'tab' }],
      ['windows modifier', { modifiers: ['windows'], key: 'd' }]
    ])
  })

  describe('when the step is invalid', () => {
    describeFailsValidation(chordStepSchema, [
      ['duplicate modifiers', { modifiers: ['ctrl', 'ctrl'], key: 'c' }],
      ['hyper authoring token', { modifiers: ['hyper'], key: 'c' }],
      ['legacy meta modifier', { modifiers: ['meta'], key: 'c' }],
      ['unknown key', { key: 'bogus' }]
    ])
  })
})

describe('bindingSchema', () => {
  const minValid = {
    chord: [{ key: 'p', modifiers: ['ctrl'] }],
    scope: 'global',
    action: 'Toggle preview'
  }
  const { action: _action, ...bindingWithoutAction } = minValid

  describe('when the binding is valid', () => {
    describe.each([
      ['minimal fields', minValid],
      [
        'all optional fields',
        {
          ...minValid,
          id: 'toggle-preview',
          platform: 'macos',
          when: 'editorHasFocus',
          group: 'navigation',
          intent: 'open',
          tags: ['ui'],
          links: [{ url: 'https://example.com' }],
          notes: [{ type: 'plain', body: 'note' }]
        }
      ]
    ])('with %s', (_, data) => {
      it('passes validation', () => {
        expect(isValid(bindingSchema, data)).toBe(true)
      })
    })
  })

  describe('when the binding is invalid', () => {
    describe.each([
      ['empty chord array', { ...minValid, chord: [] }],
      ['missing action', bindingWithoutAction],
      ['invalid scope', { ...minValid, scope: 'public' }],
      ['hyper in stored chord', { ...minValid, chord: [{ modifiers: ['hyper'], key: 'k' }] }]
    ])('with %s', (_, data) => {
      it('fails validation', () => {
        expect(isValid(bindingSchema, data)).toBe(false)
      })
    })
  })
})

describe('shortcutEntrySchema', () => {
  const base = {
    key: 'vscode',
    source: 'editor.md',
    desc: 'VS Code shortcuts',
    tags: ['editor'],
    type: 'shortcut',
    bindings: [
      {
        chord: [{ key: 'p', modifiers: ['ctrl', 'shift'] }],
        scope: 'global',
        action: 'Toggle command palette'
      }
    ]
  }

  const { bindings: _bindings, ...entryWithoutBindings } = base

  describe('when the entry is valid', () => {
    describe.each([
      ['required fields only', base],
      ['entry-level platform', { ...base, platform: 'macos' }],
      [
        'multiple bindings',
        {
          ...base,
          bindings: [
            ...base.bindings,
            {
              chord: [{ key: 'k', modifiers: ['ctrl'] }],
              scope: 'global',
              action: 'Kill line'
            }
          ]
        }
      ]
    ])('with %s', (_, data) => {
      it('passes validation', () => {
        expect(isValid(shortcutEntrySchema, data)).toBe(true)
      })
    })
  })

  describe('when the entry is invalid', () => {
    describe.each([
      ['non-shortcut type', { ...base, type: 'bookmark' }],
      ['empty bindings array', { ...base, bindings: [] }],
      ['missing bindings', entryWithoutBindings],
      [
        'binding with missing chord',
        {
          ...base,
          bindings: [{ scope: 'global', action: 'nope' }]
        }
      ]
    ])('with %s', (_, data) => {
      it('fails validation', () => {
        expect(isValid(shortcutEntrySchema, data)).toBe(false)
      })
    })
  })
})
