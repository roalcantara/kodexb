/// <reference lib="dom" />

import { expect, mock, test } from 'bun:test'
import type { RpcKnowledge } from '@shared/rpc'
import { fireTwoRightsExpectSplitThenDetail, rpcBookmarkRow } from '@testing'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useCallback, useRef, useState } from 'react'

import { useViewNavigation } from './use_view_navigation.hook'

function row(id: number): RpcKnowledge {
  return rpcBookmarkRow(id, `k${id}`)
}

function CopyKeyHarness({
  rows,
  selectedId: initialSelected,
  pushToast
}: {
  rows: RpcKnowledge[]
  selectedId: number | null
  pushToast: (msg: string, type: 'success' | 'error') => void
}) {
  const [selectedId, setSelectedId] = useState<number | null>(initialSelected)
  const [detailEntry, setDetailEntry] = useState<RpcKnowledge | null>(null)
  const { handleKey } = useViewNavigation({
    rows,
    selectedId,
    detailEntry,
    setSelectedId,
    setDetailEntry,
    pushToast
  })
  return (
    <div
      onKeyDownCapture={e => {
        handleKey(e)
        if (e.defaultPrevented) e.stopPropagation()
      }}
    >
      <div tabIndex={0} data-testid="surface" role="listbox" aria-label="Test list">
        surface
      </div>
    </div>
  )
}

function Harness({ rows }: { rows: RpcKnowledge[] }) {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detailEntry, setDetailEntry] = useState<RpcKnowledge | null>(null)
  const { viewState, handleKey } = useViewNavigation({
    rows,
    selectedId,
    detailEntry,
    setSelectedId,
    setDetailEntry
  })

  const detailIdLabel = detailEntry === null ? 'null' : String(detailEntry.id)

  return (
    <div
      onKeyDownCapture={e => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
        handleKey(e)
        if (e.defaultPrevented) e.stopPropagation()
      }}
    >
      <div tabIndex={0} data-testid="surface" role="listbox" aria-label="Test list surface">
        surface
      </div>
      <button type="button" data-testid="shell" aria-label="Test shell">
        shell
      </button>
      <span data-testid="view-state">{viewState}</span>
      <span data-testid="detail-id">{detailIdLabel}</span>
    </div>
  )
}

/** Simulates opening detail without a reducer step (illegal list+detail). */
function HarnessDesync({ rows }: { rows: RpcKnowledge[] }) {
  const [selectedId, setSelectedId] = useState<number | null>(rows[0]?.id ?? null)
  const [detailEntry, setDetailEntry] = useState<RpcKnowledge | null>(rows[0] ?? null)
  const { viewState, selectDetailEntry, handleKey } = useViewNavigation({
    rows,
    selectedId,
    detailEntry,
    setSelectedId,
    setDetailEntry
  })

  return (
    <div
      onKeyDownCapture={e => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
        handleKey(e)
        if (e.defaultPrevented) e.stopPropagation()
      }}
    >
      <div tabIndex={0} data-testid="surface" role="listbox" aria-label="Test list surface" />
      <span data-testid="view-state">{viewState}</span>
      <span data-testid="detail-id">{detailEntry === null ? 'null' : String(detailEntry.id)}</span>
      <button type="button" data-testid="pick-2" onClick={() => selectDetailEntry(2)}>
        pick 2
      </button>
    </div>
  )
}

function renderWithSurfaceFocused(rows: RpcKnowledge[]) {
  render(<Harness rows={rows} />)
  const surface = screen.getByTestId('surface')
  surface.focus()
  return surface
}

test('handleKey follows arbitrary split/detail ladder from list surface', () => {
  const surface = renderWithSurfaceFocused([row(1)])

  fireEvent.keyDown(surface, { key: 'ArrowRight' })
  expect(screen.getByTestId('view-state').textContent).toBe('split')
  expect(screen.getByTestId('detail-id').textContent).toBe('1')

  fireEvent.keyDown(surface, { key: 'ArrowLeft' })
  expect(screen.getByTestId('view-state').textContent).toBe('list')
  expect(screen.getByTestId('detail-id').textContent).toBe('null')

  fireTwoRightsExpectSplitThenDetail(surface)
  expect(screen.getByTestId('detail-id').textContent).toBe('1')

  fireEvent.keyDown(surface, { key: 'ArrowLeft' })
  expect(screen.getByTestId('view-state').textContent).toBe('split')

  fireEvent.keyDown(surface, { key: 'ArrowRight' })
  expect(screen.getByTestId('view-state').textContent).toBe('detail')

  fireEvent.keyDown(surface, { key: 'ArrowRight' })
  expect(screen.getByTestId('view-state').textContent).toBe('split')

  fireEvent.keyDown(surface, { key: 'ArrowRight' })
  expect(screen.getByTestId('view-state').textContent).toBe('detail')

  fireEvent.keyDown(surface, { key: 'ArrowLeft' })
  expect(screen.getByTestId('view-state').textContent).toBe('split')

  fireEvent.keyDown(surface, { key: 'ArrowLeft' })
  expect(screen.getByTestId('view-state').textContent).toBe('list')
  expect(screen.getByTestId('detail-id').textContent).toBe('null')
})

test('handleKey on shell continues ladder when shell is focused', () => {
  render(<Harness rows={[row(1)]} />)
  const surface = screen.getByTestId('surface')
  const shell = screen.getByTestId('shell')

  surface.focus()
  fireEvent.keyDown(surface, { key: 'ArrowRight' })
  fireEvent.keyDown(surface, { key: 'ArrowRight' })
  expect(screen.getByTestId('view-state').textContent).toBe('detail')

  shell.focus()
  fireEvent.keyDown(shell, { key: 'ArrowLeft' })
  expect(screen.getByTestId('view-state').textContent).toBe('split')

  fireEvent.keyDown(shell, { key: 'ArrowLeft' })
  expect(screen.getByTestId('view-state').textContent).toBe('list')
})

test('selectDetailEntry advances reducer when list+detail were desynced', () => {
  render(<HarnessDesync rows={[row(1), row(2)]} />)
  expect(screen.getByTestId('view-state').textContent).toBe('list')
  expect(screen.getByTestId('detail-id').textContent).toBe('1')
  fireEvent.click(screen.getByTestId('pick-2'))
  expect(screen.getByTestId('view-state').textContent).toBe('split')
  expect(screen.getByTestId('detail-id').textContent).toBe('2')
})

test('selectDetailEntry from split keeps split and updates detail row', () => {
  render(<HarnessDesync rows={[row(1), row(2)]} />)
  const surface = screen.getByTestId('surface')
  surface.focus()
  fireEvent.keyDown(surface, { key: 'ArrowRight' })
  expect(screen.getByTestId('view-state').textContent).toBe('split')
  fireEvent.click(screen.getByTestId('pick-2'))
  expect(screen.getByTestId('view-state').textContent).toBe('split')
  expect(screen.getByTestId('detail-id').textContent).toBe('2')
})

function SearchShortcutHarness({
  rows,
  onEscapeFromSearch: onEscapeProp,
  hideWindow
}: {
  rows: RpcKnowledge[]
  onEscapeFromSearch?: () => void
  hideWindow?: () => void
}) {
  const searchInputRef = useRef<HTMLInputElement>(null)
  const listSurfaceRef = useRef<HTMLDivElement>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detailEntry, setDetailEntry] = useState<RpcKnowledge | null>(null)
  const leaveSearch = useCallback(() => {
    searchInputRef.current?.blur()
    listSurfaceRef.current?.focus()
  }, [])
  const { viewState, handleKey } = useViewNavigation({
    rows,
    selectedId,
    detailEntry,
    setSelectedId,
    setDetailEntry,
    searchInputRef,
    onEscapeFromSearch: onEscapeProp ?? leaveSearch,
    hideWindow
  })
  const isFullDetail = detailEntry !== null && viewState === 'detail'
  return (
    <div
      onKeyDownCapture={e => {
        handleKey(e)
        if (e.defaultPrevented) e.stopPropagation()
      }}
    >
      {isFullDetail ? null : <input ref={searchInputRef} type="search" data-testid="search" defaultValue="typed" />}
      <div ref={listSurfaceRef} tabIndex={0} data-testid="surface" role="listbox" aria-label="Test list surface">
        surface
      </div>
      <span data-testid="view-state">{viewState}</span>
    </div>
  )
}

test('⌘L focuses search and selects all when search is mounted', () => {
  render(<SearchShortcutHarness rows={[row(1)]} />)
  const surface = screen.getByTestId('surface')
  const search = screen.getByTestId('search') as HTMLInputElement
  surface.focus()
  fireEvent.keyDown(surface, { key: 'l', metaKey: true, bubbles: true })
  expect(document.activeElement).toBe(search)
  expect(search.selectionStart).toBe(0)
  expect(search.selectionEnd).toBe(5)
})

test('⌘L from full detail retreats to split then focuses search', async () => {
  render(<SearchShortcutHarness rows={[row(1)]} />)
  const surface = screen.getByTestId('surface')
  surface.focus()
  fireEvent.keyDown(surface, { key: 'ArrowRight' })
  fireEvent.keyDown(surface, { key: 'ArrowRight' })
  expect(screen.getByTestId('view-state').textContent).toBe('detail')
  expect(screen.queryByTestId('search')).toBeNull()

  fireEvent.keyDown(surface, { key: 'l', metaKey: true, bubbles: true })
  expect(screen.getByTestId('view-state').textContent).toBe('split')

  await waitFor(
    () => {
      const search = screen.getByTestId('search') as HTMLInputElement
      expect(document.activeElement).toBe(search)
      expect(search.selectionStart).toBe(0)
      expect(search.selectionEnd).toBe(5)
    },
    { timeout: 5000 }
  )
})

test('Escape from search moves focus to list surface', () => {
  render(<SearchShortcutHarness rows={[row(1)]} />)
  const search = screen.getByTestId('search')
  const surface = screen.getByTestId('surface')
  search.focus()
  fireEvent.keyDown(search, { key: 'Escape', bubbles: true })
  expect(document.activeElement).toBe(surface)
})

test('Escape from search uses injected onEscapeFromSearch when provided', () => {
  const onEscape = mock(() => undefined)
  render(<SearchShortcutHarness rows={[row(1)]} onEscapeFromSearch={onEscape} />)
  const search = screen.getByTestId('search')
  search.focus()
  fireEvent.keyDown(search, { key: 'Escape', bubbles: true })
  expect(onEscape).toHaveBeenCalledTimes(1)
})

test('Escape from list surface calls hideWindow when detail is closed', () => {
  const hide = mock(() => undefined)
  render(<SearchShortcutHarness rows={[row(1)]} hideWindow={hide} />)
  const surface = screen.getByTestId('surface')
  surface.focus()
  fireEvent.keyDown(surface, { key: 'Escape', bubbles: true })
  expect(hide).toHaveBeenCalledTimes(1)
})

test('⌘C with no selection shows toast', () => {
  const pushToast = mock(() => undefined)
  render(<CopyKeyHarness rows={[row(1)]} selectedId={null} pushToast={pushToast} />)
  const surface = screen.getByTestId('surface')
  surface.focus()
  fireEvent.keyDown(surface, { key: 'c', metaKey: true, bubbles: true })
  expect(pushToast).toHaveBeenCalledWith('Select an entry to copy', 'success')
})

test('⌘C with selection copies and shows success toast', async () => {
  const pushToast = mock(() => undefined)
  const writeText = mock(() => Promise.resolve())
  const prev = navigator.clipboard
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
    writable: true
  })
  try {
    render(<CopyKeyHarness rows={[row(1)]} selectedId={1} pushToast={pushToast} />)
    const surface = screen.getByTestId('surface')
    surface.focus()
    fireEvent.keyDown(surface, { key: 'c', metaKey: true, bubbles: true })
    expect(writeText).toHaveBeenCalled()
    await waitFor(() => {
      expect(pushToast).toHaveBeenCalledWith(`'k1' copied to clipboard`, 'success')
    })
  } finally {
    Object.defineProperty(navigator, 'clipboard', { value: prev, configurable: true, writable: true })
  }
})
