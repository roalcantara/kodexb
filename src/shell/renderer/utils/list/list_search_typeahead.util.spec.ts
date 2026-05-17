import { describe, expect, it } from 'bun:test'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'

import { listSearchTypeaheadAction } from './list_search_typeahead.util'

describe('listSearchTypeahead', () => {
  function mockEv(
    partial: Partial<{ key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean; isComposing: boolean }>
  ): ReactKeyboardEvent<HTMLElement> {
    const isComposing = partial.isComposing ?? false
    return {
      key: partial.key ?? '',
      ctrlKey: partial.ctrlKey ?? false,
      metaKey: partial.metaKey ?? false,
      altKey: partial.altKey ?? false,
      nativeEvent: { isComposing } as globalThis.KeyboardEvent
    } as ReactKeyboardEvent<HTMLElement>
  }

  describe('when composing or with modifier', () => {
    it('returns none while composing', () => {
      expect(listSearchTypeaheadAction(mockEv({ key: 'a', isComposing: true }))).toEqual({ type: 'none' })
    })

    it('returns none with modifier keys', () => {
      expect(listSearchTypeaheadAction(mockEv({ key: 'a', ctrlKey: true }))).toEqual({ type: 'none' })
      expect(listSearchTypeaheadAction(mockEv({ key: 'a', metaKey: true }))).toEqual({ type: 'none' })
      expect(listSearchTypeaheadAction(mockEv({ key: 'a', altKey: true }))).toEqual({ type: 'none' })
    })
  })

  describe('with Backspace', () => {
    it('maps to backspace action', () => {
      expect(listSearchTypeaheadAction(mockEv({ key: 'Backspace' }))).toEqual({ type: 'backspace' })
    })
  })

  describe('with single-character keys', () => {
    it('maps to append action', () => {
      expect(listSearchTypeaheadAction(mockEv({ key: 'x' }))).toEqual({ type: 'append', char: 'x' })
      expect(listSearchTypeaheadAction(mockEv({ key: ' ' }))).toEqual({ type: 'append', char: ' ' })
    })
  })

  describe('with navigation or Enter', () => {
    it('returns none', () => {
      expect(listSearchTypeaheadAction(mockEv({ key: 'ArrowDown' }))).toEqual({ type: 'none' })
      expect(listSearchTypeaheadAction(mockEv({ key: 'Enter' }))).toEqual({ type: 'none' })
      expect(listSearchTypeaheadAction(mockEv({ key: 'Escape' }))).toEqual({ type: 'none' })
    })
  })
})
