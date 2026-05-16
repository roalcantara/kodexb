/// <reference lib="dom" />
import { afterEach, expect, test } from 'bun:test'

import { compactFilterOptionNodes, scrollCompactFilterHighlightIntoView } from './compact_filter_overlay_keyboard.util'

afterEach(() => {
  document.body.innerHTML = ''
})

test('compactFilterOptionNodes returns empty when root is undefined', () => {
  expect(compactFilterOptionNodes(undefined)).toEqual([])
})

test('compactFilterOptionNodes returns empty when root is null', () => {
  expect(compactFilterOptionNodes(null)).toEqual([])
})

test('scrollCompactFilterHighlightIntoView skips when DOM row count mismatches revision key', () => {
  document.body.innerHTML = `
    <div class="kb-pt-filter-dropdown">
      <input type="search" />
      <div data-compact-filter-scroll-root>
        <button type="button" data-compact-filter-row>one</button>
      </div>
    </div>
  `
  const scrollRoot = document.querySelector('[data-compact-filter-scroll-root]') as HTMLDivElement
  const input = document.querySelector('input') as HTMLInputElement
  const scrollRootRef = { current: scrollRoot }
  const searchInputRef = { current: input }
  expect(() => scrollCompactFilterHighlightIntoView(scrollRootRef, searchInputRef, 0, 'one\0two')).not.toThrow()
})
