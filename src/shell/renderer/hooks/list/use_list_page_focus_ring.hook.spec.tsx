import { describe, expect, it } from 'bun:test'
import { fireEvent, render, screen } from '@testing-library/react'
import { useRef } from 'react'

import { useListPageFocusRing } from './use_list_page_focus_ring.hook'

describe('useListPageFocusRing', () => {
  function RingHarness() {
    const listPageRef = useRef<HTMLDivElement>(null)
    const filterButtonRef = useRef<HTMLButtonElement>(null)
    const searchInputRef = useRef<HTMLInputElement>(null)
    const listSurfaceRef = useRef<HTMLDivElement>(null)

    const { onListPageKeyDownCapture } = useListPageFocusRing({
      showSettings: false,
      filterOpen: false,
      detailEntry: null,
      listPageRef,
      filterButtonRef,
      searchInputRef,
      listSurfaceRef
    })

    return (
      <div ref={listPageRef} onKeyDownCapture={onListPageKeyDownCapture}>
        <button ref={filterButtonRef} type="button">
          filter
        </button>
        <input ref={searchInputRef} type="text" aria-label="Search" />
        <div ref={listSurfaceRef} tabIndex={0} role="listbox">
          list
        </div>
      </div>
    )
  }

  describe('when Tab is pressed from search', () => {
    it('moves focus to list surface', () => {
      render(<RingHarness />)
      const search = screen.getByRole('textbox', { name: 'Search' })
      search.focus()
      fireEvent.keyDown(search, { key: 'Tab', shiftKey: false })
      expect(document.activeElement?.textContent).toBe('list')
    })
  })

  describe('when Shift+Tab is pressed from search', () => {
    it('moves focus to filter', () => {
      render(<RingHarness />)
      const search = screen.getByRole('textbox', { name: 'Search' })
      search.focus()
      fireEvent.keyDown(search, { key: 'Tab', shiftKey: true })
      expect(document.activeElement?.textContent).toBe('filter')
    })
  })

  describe('when Tab is pressed from list', () => {
    it('wraps focus to filter', () => {
      render(<RingHarness />)
      const list = screen.getByRole('listbox')
      list.focus()
      fireEvent.keyDown(list, { key: 'Tab', shiftKey: false })
      expect(document.activeElement?.textContent).toBe('filter')
    })
  })

  describe('on mount', () => {
    it('autofocuses search when ring is active', async () => {
      render(<RingHarness />)
      const search = screen.getByRole('textbox', { name: 'Search' })
      await new Promise<void>(resolve => {
        requestAnimationFrame(() => {
          expect(document.activeElement).toBe(search)
          resolve()
        })
      })
    })
  })
})
