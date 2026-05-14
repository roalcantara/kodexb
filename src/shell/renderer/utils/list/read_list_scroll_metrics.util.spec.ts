/// <reference lib="dom" />

import { expect, test } from 'bun:test'

import { DEFAULT_LIST_ROW_HEIGHT_PX } from '../../constants/ui.const'
import { readListScrollMetrics } from './read_list_scroll_metrics.util'

function mockRowHeight(el: HTMLElement, height: number) {
  el.getBoundingClientRect = () => new DOMRect(0, 0, 100, height)
}

test('uses measured .kb-pt-row height when present', () => {
  const root = document.createElement('div')
  const row = document.createElement('button')
  row.type = 'button'
  row.className = 'kb-pt-row'
  root.appendChild(row)
  mockRowHeight(row, 56)
  const m = readListScrollMetrics(root)
  expect(m.rowHeight).toBe(56)
})

test('uses measured .kb-entryRow when no pt row', () => {
  const root = document.createElement('div')
  const row = document.createElement('button')
  row.type = 'button'
  row.className = 'kb-entryRow'
  root.appendChild(row)
  mockRowHeight(row, 44)
  const m = readListScrollMetrics(root)
  expect(m.rowHeight).toBe(44)
})

test('prefers first .kb-pt-row in document order', () => {
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

test('falls back to default when no measurable row', () => {
  const root = document.createElement('div')
  const m = readListScrollMetrics(root)
  expect(m.rowHeight).toBe(DEFAULT_LIST_ROW_HEIGHT_PX)
})
