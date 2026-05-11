import { expect, test } from 'bun:test'

import { DEFAULT_VIEWPORT_LIST_PAGE_SIZE } from '../../constants/ui.const'
import { effectiveListPageSize, listViewportPageSize } from './list_viewport_page_size.util'

test('listViewportPageSize returns visible rows plus overscan', () => {
  expect(listViewportPageSize(880, 44, 10)).toBe(30)
})

test('listViewportPageSize keeps a useful minimum before layout is known', () => {
  expect(listViewportPageSize(0, 44, 10)).toBe(DEFAULT_VIEWPORT_LIST_PAGE_SIZE)
  expect(listViewportPageSize(100, 0, 10)).toBe(DEFAULT_VIEWPORT_LIST_PAGE_SIZE)
})

test('listViewportPageSize caps unusually tall host viewports', () => {
  expect(listViewportPageSize(100_000, 44, 10)).toBe(200)
})

test('effectiveListPageSize uses config when viewport cap is omitted', () => {
  expect(effectiveListPageSize(undefined, 100)).toBe(100)
})

test('effectiveListPageSize is the smaller of viewport cap and config', () => {
  expect(effectiveListPageSize(30, 100)).toBe(30)
  expect(effectiveListPageSize(120, 50)).toBe(50)
})
