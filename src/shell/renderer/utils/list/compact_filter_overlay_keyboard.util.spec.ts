import { afterEach, describe, expect, it } from 'bun:test'

import { compactFilterOptionNodes, scrollCompactFilterHighlightIntoView } from './compact_filter_overlay_keyboard.util'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('compactFilterOverlayKeyboard', () => {
  describe('compactFilterOptionNodes', () => {
    describe('with nullish root', () => {
      it('returns empty for undefined', () => {
        expect(compactFilterOptionNodes(undefined)).toEqual([])
      })

      it('returns empty for null', () => {
        expect(compactFilterOptionNodes(null)).toEqual([])
      })
    })
  })

  describe('scrollCompactFilterHighlightIntoView', () => {
    describe('when row count mismatches', () => {
      it('skips scrolling', () => {
        document.body.innerHTML = `
        <div class="theme-filter-dropdown">
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
    })
  })
})
