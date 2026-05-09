import { expect, test } from 'bun:test'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'

import { listSearchTypeaheadAction } from './list_search_typeahead.util'

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

test('listSearchTypeaheadAction returns none while composing', () => {
  expect(listSearchTypeaheadAction(mockEv({ key: 'a', isComposing: true }))).toEqual({ type: 'none' })
})

test('listSearchTypeaheadAction returns none with modifier', () => {
  expect(listSearchTypeaheadAction(mockEv({ key: 'a', ctrlKey: true }))).toEqual({ type: 'none' })
  expect(listSearchTypeaheadAction(mockEv({ key: 'a', metaKey: true }))).toEqual({ type: 'none' })
  expect(listSearchTypeaheadAction(mockEv({ key: 'a', altKey: true }))).toEqual({ type: 'none' })
})

test('listSearchTypeaheadAction maps Backspace', () => {
  expect(listSearchTypeaheadAction(mockEv({ key: 'Backspace' }))).toEqual({ type: 'backspace' })
})

test('listSearchTypeaheadAction maps single-character keys', () => {
  expect(listSearchTypeaheadAction(mockEv({ key: 'x' }))).toEqual({ type: 'append', char: 'x' })
  expect(listSearchTypeaheadAction(mockEv({ key: ' ' }))).toEqual({ type: 'append', char: ' ' })
})

test('listSearchTypeaheadAction ignores navigation and Enter', () => {
  expect(listSearchTypeaheadAction(mockEv({ key: 'ArrowDown' }))).toEqual({ type: 'none' })
  expect(listSearchTypeaheadAction(mockEv({ key: 'Enter' }))).toEqual({ type: 'none' })
  expect(listSearchTypeaheadAction(mockEv({ key: 'Escape' }))).toEqual({ type: 'none' })
})
