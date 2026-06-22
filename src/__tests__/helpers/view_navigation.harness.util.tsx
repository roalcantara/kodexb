import type { Knowledge } from '@core'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { useCallback, useRef, useState } from 'react'
import type { EntryActionContext } from '../../shell/renderer/actions/panel/panel.types'
import { useRecordDetailVisit } from '../../shell/renderer/hooks/list/use_record_detail_visit.hook'
import {
  useViewNavigation,
  type ViewNavigationKeyEvent
} from '../../shell/renderer/hooks/list/use_view_navigation.hook'
import { viewNavBookmarkRow } from './view_navigation.harness_rows.util'

export { viewNavBookmarkRow }

type KeyCaptureMode = 'horizontal' | 'all'

export function ViewNavKeyCapture({
  handleKey,
  children,
  mode = 'all'
}: {
  handleKey: (e: ViewNavigationKeyEvent) => void
  children: ReactNode
  mode?: KeyCaptureMode
}) {
  return (
    <div
      onKeyDownCapture={e => {
        if (mode === 'horizontal' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
        handleKey(e)
        if (e.defaultPrevented) e.stopPropagation()
      }}
    >
      {children}
    </div>
  )
}

export function ViewNavigationHarness({ rows }: { rows: Knowledge[] }) {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detailEntry, setDetailEntry] = useState<Knowledge | null>(null)
  const { viewState, handleKey } = useViewNavigation({
    rows,
    selectedId,
    detailEntry,
    setSelectedId,
    setDetailEntry
  })
  const detailIdLabel = detailEntry === null ? 'null' : String(detailEntry.id)

  return (
    <ViewNavKeyCapture handleKey={handleKey} mode="horizontal">
      <div tabIndex={0} data-testid="surface" role="listbox" aria-label="Test list surface">
        surface
      </div>
      <button type="button" data-testid="shell" aria-label="Test shell">
        shell
      </button>
      <span data-testid="view-state">{viewState}</span>
      <span data-testid="detail-id">{detailIdLabel}</span>
    </ViewNavKeyCapture>
  )
}

export function ViewNavigationDesyncHarness({ rows }: { rows: Knowledge[] }) {
  const [selectedId, setSelectedId] = useState<number | null>(rows[0]?.id ?? null)
  const [detailEntry, setDetailEntry] = useState<Knowledge | null>(rows[0] ?? null)
  const { viewState, selectDetailEntry, handleKey } = useViewNavigation({
    rows,
    selectedId,
    detailEntry,
    setSelectedId,
    setDetailEntry
  })

  return (
    <ViewNavKeyCapture handleKey={handleKey} mode="horizontal">
      <div tabIndex={0} data-testid="surface" role="listbox" aria-label="Test list surface" />
      <span data-testid="view-state">{viewState}</span>
      <span data-testid="detail-id">{detailEntry === null ? 'null' : String(detailEntry.id)}</span>
      <button type="button" data-testid="pick-2" onClick={() => selectDetailEntry(2)}>
        pick 2
      </button>
    </ViewNavKeyCapture>
  )
}

export function ViewNavigationVisitHarness({ rows }: { rows: Knowledge[] }) {
  const [selectedId, setSelectedId] = useState<number | null>(rows[0]?.id ?? null)
  const [detailEntry, setDetailEntry] = useState<Knowledge | null>(null)
  const { advance, selectDetailEntry, handleKey } = useViewNavigation({
    rows,
    selectedId,
    detailEntry,
    setSelectedId,
    setDetailEntry
  })
  useRecordDetailVisit(detailEntry)

  return (
    <div>
      <ViewNavKeyCapture handleKey={handleKey}>
        <div tabIndex={0} role="listbox" aria-label="Test list surface" data-testid="surface">
          surface
        </div>
      </ViewNavKeyCapture>
      <button type="button" data-testid="advance" onClick={() => advance()}>
        advance
      </button>
      <button type="button" data-testid="select-2" onClick={() => selectDetailEntry(2)}>
        select 2
      </button>
    </div>
  )
}

export function ViewNavigationCopyHarness({
  rows,
  selectedId: initialSelected,
  pushToast,
  actionCtx
}: {
  rows: Knowledge[]
  selectedId: number | null
  pushToast: (msg: string, type: 'success' | 'error') => void
  actionCtx?: EntryActionContext
}) {
  const [selectedId, setSelectedId] = useState<number | null>(initialSelected)
  const [detailEntry, setDetailEntry] = useState<Knowledge | null>(null)
  const { handleKey } = useViewNavigation({
    rows,
    selectedId,
    detailEntry,
    setSelectedId,
    setDetailEntry,
    pushToast,
    actionCtx
  })

  return (
    <ViewNavKeyCapture handleKey={handleKey}>
      <div tabIndex={0} data-testid="surface" role="listbox" aria-label="Test list surface" />
    </ViewNavKeyCapture>
  )
}

export function ViewNavigationSearchHarness({
  rows,
  onEscapeFromSearch: onEscapeProp,
  hideWindow
}: {
  rows: Knowledge[]
  onEscapeFromSearch?: () => void
  hideWindow?: () => void
}) {
  const searchInputRef = useRef<HTMLInputElement>(null)
  const listSurfaceRef = useRef<HTMLDivElement>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detailEntry, setDetailEntry] = useState<Knowledge | null>(null)
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
    <ViewNavKeyCapture handleKey={handleKey}>
      {isFullDetail ? null : <input ref={searchInputRef} type="search" data-testid="search" defaultValue="typed" />}
      <div ref={listSurfaceRef} tabIndex={0} data-testid="surface" role="listbox" aria-label="Test list surface">
        surface
      </div>
      <span data-testid="view-state">{viewState}</span>
    </ViewNavKeyCapture>
  )
}

export function renderViewNavSurfaceFocused(rows: Knowledge[]): HTMLElement {
  render(<ViewNavigationHarness rows={rows} />)
  const surface = screen.getByTestId('surface')
  surface.focus()
  return surface
}
