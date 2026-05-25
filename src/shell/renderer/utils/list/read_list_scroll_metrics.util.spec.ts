import { describe, expect, it } from 'bun:test'

import { DEFAULT_LIST_ROW_HEIGHT_PX } from '../../constants/ui.const'
import { readListScrollMetrics } from './read_list_scroll_metrics.util'

function mockRowHeight(el: HTMLElement, height: number) {
  el.getBoundingClientRect = () => new DOMRect(0, 0, 100, height)
}

describe('readListScrollMetrics', () => {
  describe('when .kb-pt-row is present', () => {
    it('uses its measured height', () => {
      const root = document.createElement('div')
      const row = document.createElement('button')
      row.type = 'button'
      row.className = 'kb-pt-row'
      root.appendChild(row)
      mockRowHeight(row, 56)
      const m = readListScrollMetrics(root)
      expect(m.rowHeight).toBe(56)
    })
  })

  describe('when no .kb-pt-row but .kb-entryRow exists', () => {
    it('uses .kb-entryRow height', () => {
      const root = document.createElement('div')
      const row = document.createElement('button')
      row.type = 'button'
      row.className = 'kb-entryRow'
      root.appendChild(row)
      mockRowHeight(row, 44)
      const m = readListScrollMetrics(root)
      expect(m.rowHeight).toBe(44)
    })
  })

  describe('when multiple rows exist', () => {
    it('prefers first .kb-pt-row in document order', () => {
      const root = document.createElement('div')
      const a = document.createElement('button')
      a.type = 'button'
      a.className = 'kb-pt-row'
      mockRowHeight(a, 48)
      const b = document.createElement('button')
      b.type = 'button'
      b.className = 'kb-pt-row'
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
