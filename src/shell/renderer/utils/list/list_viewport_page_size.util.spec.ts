import { describe, expect, it } from 'bun:test'

import { DEFAULT_VIEWPORT_LIST_PAGE_SIZE } from '../../constants/ui.const'
import { effectiveListPageSize, listViewportPageSize } from './list_viewport_page_size.util'

describe('listViewportPageSize', () => {
  describe('listViewportPageSize', () => {
    describe('when viewport height is known', () => {
      it('returns visible rows plus overscan', () => {
        expect(listViewportPageSize(880, 44, 10)).toBe(30)
      })
    })

    describe('when layout is unknown', () => {
      it('returns default minimum', () => {
        expect(listViewportPageSize(0, 44, 10)).toBe(DEFAULT_VIEWPORT_LIST_PAGE_SIZE)
        expect(listViewportPageSize(100, 0, 10)).toBe(DEFAULT_VIEWPORT_LIST_PAGE_SIZE)
      })
    })

    describe('when viewport is extremely tall', () => {
      it('caps at maximum', () => {
        expect(listViewportPageSize(100_000, 44, 10)).toBe(200)
      })
    })
  })

  describe('effectiveListPageSize', () => {
    describe('when viewport cap is omitted', () => {
      it('returns config value', () => {
        expect(effectiveListPageSize(undefined, 100)).toBe(100)
      })
    })

    describe('when viewport cap is set', () => {
      it('returns the smaller of cap and config', () => {
        expect(effectiveListPageSize(30, 100)).toBe(30)
        expect(effectiveListPageSize(120, 50)).toBe(50)
      })
    })
  })
})
