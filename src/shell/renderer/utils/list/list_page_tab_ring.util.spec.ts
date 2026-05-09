/// <reference lib="dom" />

import { expect, test } from 'bun:test'
import { createRef } from 'react'

import { collectTabOrderedFocusables, listPageFocusRingElements } from './list_page_tab_ring.util'

test('collectTabOrderedFocusables returns document order', () => {
  const root = document.createElement('div')
  root.innerHTML = '<button type="button">a</button><input type="text" /><a href="#">x</a>'
  const els = collectTabOrderedFocusables(root)
  expect(els.map(e => e.tagName)).toEqual(['BUTTON', 'INPUT', 'A'])
})

test('listPageFocusRingElements appends detail and filter focusables after base refs', () => {
  const listPage = document.createElement('div')
  listPage.innerHTML = `
    <button type="button" id="filter">filter</button>
    <input id="search" type="text" />
    <button type="button" id="sync">sync</button>
    <button type="button" id="settings">settings</button>
    <div id="list" tabindex="0">list</div>
    <aside class="kb-detailPanel kb-detailPanel--visible">
      <button type="button" id="detailBtn">detail-btn</button>
    </aside>
    <div class="kb-filterStack">
      <button type="button" id="backdrop">backdrop</button>
      <section class="kb-filterDrop"><input id="filterQ" type="text" /></section>
    </div>
  `

  const filterButtonRef = createRef<HTMLButtonElement>()
  const searchInputRef = createRef<HTMLInputElement>()
  const syncButtonRef = createRef<HTMLButtonElement>()
  const settingsButtonRef = createRef<HTMLButtonElement>()
  const listSurfaceRef = createRef<HTMLDivElement>()

  filterButtonRef.current = listPage.querySelector('#filter')
  searchInputRef.current = listPage.querySelector('#search')
  syncButtonRef.current = listPage.querySelector('#sync')
  settingsButtonRef.current = listPage.querySelector('#settings')
  listSurfaceRef.current = listPage.querySelector('#list')

  const chain = listPageFocusRingElements(
    {
      filterButtonRef,
      searchInputRef,
      syncButtonRef,
      settingsButtonRef,
      listSurfaceRef
    },
    { listPageRoot: listPage, filterOpen: true, detailOpen: true }
  )

  const ids = chain.map(el => el.id)
  expect(ids).toEqual(['filter', 'search', 'sync', 'settings', 'list', 'detailBtn', 'backdrop', 'filterQ'])
})
