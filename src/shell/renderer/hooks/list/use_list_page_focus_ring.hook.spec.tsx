/// <reference lib="dom" />

import { expect, test } from 'bun:test'
import { fireEvent, render, screen } from '@testing-library/react'
import { useRef } from 'react'

import { useListPageFocusRing } from './use_list_page_focus_ring.hook'

function RingHarness() {
  const listPageRef = useRef<HTMLDivElement>(null)
  const filterButtonRef = useRef<HTMLButtonElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const syncButtonRef = useRef<HTMLButtonElement>(null)
  const settingsButtonRef = useRef<HTMLButtonElement>(null)
  const listSurfaceRef = useRef<HTMLDivElement>(null)

  const { onListPageKeyDownCapture } = useListPageFocusRing({
    showSettings: false,
    filterOpen: false,
    detailEntry: null,
    listPageRef,
    filterButtonRef,
    searchInputRef,
    syncButtonRef,
    settingsButtonRef,
    listSurfaceRef
  })

  return (
    <div ref={listPageRef} onKeyDownCapture={onListPageKeyDownCapture}>
      <button ref={filterButtonRef} type="button">
        filter
      </button>
      <input ref={searchInputRef} type="text" aria-label="Search" />
      <button ref={syncButtonRef} type="button">
        sync
      </button>
      <button ref={settingsButtonRef} type="button">
        settings
      </button>
      <div ref={listSurfaceRef} tabIndex={0} role="listbox">
        list
      </div>
    </div>
  )
}

test('Tab from search moves focus to sync', () => {
  render(<RingHarness />)
  const search = screen.getByRole('textbox', { name: 'Search' })
  search.focus()
  fireEvent.keyDown(search, { key: 'Tab', shiftKey: false })
  expect(document.activeElement?.textContent).toBe('sync')
})

test('Shift+Tab from search moves focus to filter', () => {
  render(<RingHarness />)
  const search = screen.getByRole('textbox', { name: 'Search' })
  search.focus()
  fireEvent.keyDown(search, { key: 'Tab', shiftKey: true })
  expect(document.activeElement?.textContent).toBe('filter')
})

test('Tab from list wraps to filter', () => {
  render(<RingHarness />)
  const list = screen.getByRole('listbox')
  list.focus()
  fireEvent.keyDown(list, { key: 'Tab', shiftKey: false })
  expect(document.activeElement?.textContent).toBe('filter')
})

test('autofocus effect focuses search when ring is active', async () => {
  render(<RingHarness />)
  const search = screen.getByRole('textbox', { name: 'Search' })
  await new Promise<void>(resolve => {
    requestAnimationFrame(() => {
      expect(document.activeElement).toBe(search)
      resolve()
    })
  })
})
