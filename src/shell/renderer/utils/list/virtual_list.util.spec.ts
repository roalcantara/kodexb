import { describe, expect, it } from 'bun:test'

import { DEFAULT_LIST_ROW_HEIGHT_PX, DEFAULT_VIEWPORT_LIST_PAGE_SIZE } from '../../constants/ui.const'
import {
  effectiveListPageSize,
  listViewportPageSize,
  readListScrollMetrics,
  virtualListWindow
} from './virtual_list.util'

function mockRowHeight(el: HTMLElement, height: number) {
  el.getBoundingClientRect = () => new DOMRect(0, 0, 100, height)
}

describe('virtualListWindow', () => {
  describe('with normal viewport', () => {
    it('renders viewport rows plus overscan', () => {
      expect(
        virtualListWindow({ total: 1000, scrollTop: 0, viewportHeight: 880, rowHeight: 44, overscan: 10 })
      ).toEqual({
        startIndex: 0,
        endIndex: 30,
        paddingTop: 0,
        paddingBottom: 42_680
      })
    })
  })

  describe('while scrolling', () => {
    it('adds top and bottom spacer heights', () => {
      expect(
        virtualListWindow({ total: 1000, scrollTop: 880, viewportHeight: 880, rowHeight: 44, overscan: 10 })
      ).toEqual({
        startIndex: 15,
        endIndex: 45,
        paddingTop: 660,
        paddingBottom: 42_020
      })
    })
  })

  describe('before viewport measurement', () => {
    it('renders a safe default', () => {
      expect(virtualListWindow({ total: 1000, scrollTop: 0, viewportHeight: 0, rowHeight: 44, overscan: 5 })).toEqual({
        startIndex: 0,
        endIndex: 35,
        paddingTop: 0,
        paddingBottom: 42_460
      })
    })
  })
})

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

describe('readListScrollMetrics', () => {
  describe('when .theme-list-row is present', () => {
    it('uses its measured height', () => {
      const root = document.createElement('div')
      const row = document.createElement('button')
      row.type = 'button'
      row.className = 'theme-list-row'
      root.appendChild(row)
      mockRowHeight(row, 56)
      const m = readListScrollMetrics(root)
      expect(m.rowHeight).toBe(56)
    })
  })

  describe('when no .theme-list-row but .theme-entry-row exists', () => {
    it('uses .theme-entry-row height', () => {
      const root = document.createElement('div')
      const row = document.createElement('button')
      row.type = 'button'
      row.className = 'theme-entry-row'
      root.appendChild(row)
      mockRowHeight(row, 44)
      const m = readListScrollMetrics(root)
      expect(m.rowHeight).toBe(44)
    })
  })

  describe('when multiple rows exist', () => {
    it('prefers first .theme-list-row in document order', () => {
      const root = document.createElement('div')
      const a = document.createElement('button')
      a.type = 'button'
      a.className = 'theme-list-row'
      mockRowHeight(a, 48)
      const b = document.createElement('button')
      b.type = 'button'
      b.className = 'theme-list-row'
      mockRowHeight(b, 72)
      root.append(a, b)
      const m = readListScrollMetrics(root)
      expect(m.rowHeight).toBe(48)
    })
  })

  describe('when no measurable row exists', () => {
    it('falls back to default height', () => {
      const root = document.createElement('div')
      const m = readListScrollMetrics(root)
      expect(m.rowHeight).toBe(DEFAULT_LIST_ROW_HEIGHT_PX)
    })
  })
})
