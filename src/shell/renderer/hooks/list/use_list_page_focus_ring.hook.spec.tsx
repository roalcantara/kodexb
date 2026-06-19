import { describe, expect, it } from 'bun:test'
import type { RpcKnowledge } from '@shared/rpc'
import { rpcBookmarkRow } from '@testing'
import { fireEvent, render, screen } from '@testing-library/react'
import type React from 'react'
import { type KeyboardEvent as ReactKeyboardEvent, useEffect, useRef } from 'react'

import { focusListSurface } from '../../utils/list/list_keyboard.util'
import { scheduleDoubleRaf } from '../../utils/list/list_scroll.util'
import { useListPageFocusRing } from './use_list_page_focus_ring.hook'
import { useListSelection } from './use_list_selection.hook'
import { useWindowViewNavKeys } from './use_window_view_nav_keys.hook'

describe('useListPageFocusRing', () => {
  function RingHarness({ selectedId = null }: { selectedId?: number | null }) {
    const listPageRef = useRef<HTMLDivElement>(null)
    const filterButtonRef = useRef<HTMLButtonElement>(null)
    const searchInputRef = useRef<HTMLInputElement>(null)
    const listSurfaceRef = useRef<HTMLDivElement>(null)

    const { onListPageKeyDownCapture } = useListPageFocusRing({
      showSettings: false,
      filterOpen: false,
      detailEntry: null,
      selectedId,
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
      const search = screen.getByRole<HTMLInputElement>('textbox', { name: 'Search' })
      await flushDoubleRafUntilFocused(search)
      expect(document.activeElement).toBe(search)
    })

    // Regression: returning to the list with a row selected must NOT steal focus
    // into search, otherwise ArrowRight (view nav) is swallowed by the input.
    it('does not autofocus search when a row is selected', async () => {
      render(<RingHarness selectedId={3} />)
      const search = screen.getByRole<HTMLInputElement>('textbox', { name: 'Search' })
      const list = screen.getByRole('listbox')
      list.focus()
      await flushDoubleRafUntilFocused(search)
      expect(document.activeElement).not.toBe(search)
      expect(document.activeElement).toBe(list)
    })
  })
})

async function flushDoubleRafUntilFocused(search: HTMLInputElement, pass = 0): Promise<void> {
  if (document.activeElement === search || pass >= 8) return
  await new Promise<void>(r => queueMicrotask(r))
  await new Promise<void>(r => requestAnimationFrame(() => r()))
  return flushDoubleRafUntilFocused(search, pass + 1)
}

// ── End-to-end regression: ArrowRight must re-advance after a full retreat ──
//
// Mirrors ListPage (parent: search-autofocus effect) wrapping ListMain (child:
// list-surface focus effect + window-capture nav). React runs the child effect
// before the parent, so the parent's search autofocus would otherwise win the
// focus race on return-to-list and swallow the next ArrowRight.

function row(id: number): RpcKnowledge {
  return rpcBookmarkRow(id, `k${id}`)
}

function MainChild({
  sel,
  surfaceRef,
  searchRef
}: {
  sel: ReturnType<typeof useListSelection>
  surfaceRef: React.RefObject<HTMLDivElement | null>
  searchRef: React.RefObject<HTMLInputElement | null>
}) {
  const detailScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (sel.detailEntry) return
    let attempts = 0
    const tryFocus = () => {
      const s = surfaceRef.current
      if (!s) return
      s.focus({ preventScroll: true })
      if (document.activeElement === s) return
      if (++attempts < 2) scheduleDoubleRaf(tryFocus)
    }
    scheduleDoubleRaf(tryFocus)
  }, [sel.detailEntry, surfaceRef])

  const isFullDetail = sel.detailEntry !== null && sel.viewState === 'detail'
  useWindowViewNavKeys({
    disabled: false,
    handleKey: sel.handleKey,
    handleListArrows: e => {
      sel.onListKeyDown(e as unknown as ReactKeyboardEvent<HTMLDivElement>)
    },
    detailScrollRef,
    detailScrollActive: sel.detailEntry !== null
  })

  const onSearchKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'ArrowDown') return
    e.preventDefault()
    sel.selectFirst()
    focusListSurface(surfaceRef)
  }

  return (
    <>
      <input ref={searchRef} aria-label="Search" onKeyDown={onSearchKeyDown} />
      <div
        ref={surfaceRef}
        tabIndex={0}
        role="listbox"
        data-testid="list-surface"
        style={{ display: isFullDetail ? 'none' : undefined }}
        onKeyDown={sel.onListKeyDown}
      >
        <span data-testid="selected">{sel.selectedId ?? 'null'}</span>
        <span data-testid="view-state">{sel.viewState}</span>
      </div>
      {sel.detailEntry ? (
        <div ref={detailScrollRef} data-testid="detail-panel">
          <span data-testid="detail">{sel.detailEntry.id}</span>
        </div>
      ) : (
        <span data-testid="detail">null</span>
      )}
    </>
  )
}

function NavHarness({ rows }: { rows: RpcKnowledge[] }) {
  const listPageRef = useRef<HTMLDivElement>(null)
  const surfaceRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const filterButtonRef = useRef<HTMLButtonElement>(null)

  const sel = useListSelection(rows, undefined, () => focusListSurface(surfaceRef), searchRef)

  const { onListPageKeyDownCapture } = useListPageFocusRing({
    showSettings: false,
    filterOpen: false,
    detailEntry: sel.detailEntry,
    selectedId: sel.selectedId,
    listPageRef,
    filterButtonRef,
    searchInputRef: searchRef,
    listSurfaceRef: surfaceRef
  })

  return (
    <div ref={listPageRef} onKeyDownCapture={onListPageKeyDownCapture}>
      <button ref={filterButtonRef} type="button">
        filter
      </button>
      <MainChild sel={sel} surfaceRef={surfaceRef} searchRef={searchRef} />
    </div>
  )
}

async function flushRaf(times = 6): Promise<void> {
  if (times <= 0) return
  await new Promise<void>(r => queueMicrotask(r))
  await new Promise<void>(r => requestAnimationFrame(() => r()))
  return flushRaf(times - 1)
}

describe('list keyboard navigation focus', () => {
  const vs = () => screen.getByTestId('view-state').textContent

  it('ArrowRight re-advances to split after retreating list → split → detail → split → list', async () => {
    render(<NavHarness rows={[row(1), row(2), row(3), row(4)]} />)
    await flushRaf()

    // ArrowDown ×3: first from search → list (row 1), then within list → row 3.
    const search = screen.getByRole('textbox', { name: 'Search' })
    fireEvent.keyDown(search, { key: 'ArrowDown' })
    const surface = screen.getByTestId('list-surface')
    fireEvent.keyDown(surface, { key: 'ArrowDown' })
    fireEvent.keyDown(surface, { key: 'ArrowDown' })
    expect(screen.getByTestId('selected').textContent).toBe('3')

    // ArrowRight → split, ArrowRight → detail.
    fireEvent.keyDown(surface, { key: 'ArrowRight' })
    expect(vs()).toBe('split')
    fireEvent.keyDown(screen.getByTestId('detail-panel'), { key: 'ArrowRight' })
    expect(vs()).toBe('detail')

    // ArrowLeft → split, ArrowLeft → list.
    fireEvent.keyDown(screen.getByTestId('detail-panel'), { key: 'ArrowLeft' })
    expect(vs()).toBe('split')
    fireEvent.keyDown(screen.getByTestId('list-surface'), { key: 'ArrowLeft' })
    expect(vs()).toBe('list')

    // Let the return-to-list focus effects settle; focus must stay on the list
    // surface (with a row still selected), not be stolen into search.
    await flushRaf()
    expect(document.activeElement).toBe(screen.getByTestId('list-surface'))

    // ArrowRight must advance back into split (the reported bug left it stuck).
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'ArrowRight' })
    expect(vs()).toBe('split')
  })
})
