// @list_navigation
import { describe, expect, it, mock } from 'bun:test'
import type { RpcKnowledge } from '@shared/rpc'
import { expectViewState, fireArrowKey, fireTwoRightsExpectSplitThenDetail, rpcBookmarkRow } from '@testing'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { type KeyboardEvent as ReactKeyboardEvent, useRef } from 'react'

import { focusListSurface } from '../../utils/list/list_keyboard.util'
import { useListSelection } from './use_list_selection.hook'
import { useWindowViewNavKeys } from './use_window_view_nav_keys.hook'

function Harness({ rows, onLeaveListUpward }: { rows: RpcKnowledge[]; onLeaveListUpward?: () => void }) {
  const sel = useListSelection(rows, onLeaveListUpward)
  return (
    <div
      onKeyDownCapture={e => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
        sel.handleKey(e)
        if (e.defaultPrevented) e.stopPropagation()
      }}
    >
      <div tabIndex={0} data-testid="list-surface" onKeyDown={sel.onListKeyDown} role="listbox" aria-label="Test list">
        <span data-testid="selected">{sel.selectedId ?? 'null'}</span>
        <span data-testid="detail">{sel.detailEntry?.id ?? 'null'}</span>
        <span data-testid="view-state">{sel.viewState}</span>
      </div>
    </div>
  )
}

function row(id: number, key = `k${id}`): RpcKnowledge {
  return rpcBookmarkRow(id, key)
}

function renderFocusedSurface(rows: RpcKnowledge[], onLeaveListUpward?: () => void): HTMLElement {
  render(<Harness rows={rows} onLeaveListUpward={onLeaveListUpward} />)
  const surface = screen.getByTestId('list-surface')
  surface.focus()
  return surface
}

/**
 * Mirrors `list_main.component.tsx` keyboard wiring: ArrowUp/Down flow through the
 * `window`-capture handler (`useWindowViewNavKeys` → `onListKeyDown`), and the list
 * surface is `display:none` in full detail. This is the path the visible-surface
 * {@link Harness} never exercises — it is where full-detail arrow nav must keep
 * `selectedId` and `detailEntry` in sync.
 */
function WindowCaptureHarness({ rows }: { rows: RpcKnowledge[] }) {
  const surfaceRef = useRef<HTMLDivElement>(null)
  const detailScrollRef = useRef<HTMLDivElement>(null)
  const sel = useListSelection(rows, undefined, () => focusListSurface(surfaceRef))
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

  return (
    <div>
      <div
        ref={surfaceRef}
        tabIndex={0}
        data-testid="list-surface"
        role="listbox"
        aria-label="Test list"
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
    </div>
  )
}

/** Renders {@link WindowCaptureHarness} and advances ArrowRight twice into full detail. */
function renderFullDetail(rows: RpcKnowledge[], downs: number): void {
  render(<WindowCaptureHarness rows={rows} />)
  const surface = screen.getByTestId('list-surface')
  surface.focus()
  for (let i = 0; i < downs; i++) fireEvent.keyDown(surface, { key: 'ArrowDown' })
  fireArrowKey(surface, 'ArrowRight')
  expectViewState('split')
  fireArrowKey(surface, 'ArrowRight')
  expectViewState('detail')
  // Full detail hides the list panel (display:none); real focus falls back to <body>.
  ;(document.activeElement as HTMLElement | null)?.blur?.()
}

describe('useListSelection', () => {
  describe('when navigating split/detail with ArrowLeft/Right', () => {
    it.each([
      { title: 'ArrowLeft closes detail when detail is open', reopen: false },
      { title: 'ArrowRight works repeatedly after close', reopen: true }
    ])('$title', async ({ reopen }) => {
      const user = userEvent.setup()
      const surface = renderFocusedSurface([row(1)])
      await user.keyboard('{ArrowDown}')
      fireEvent.keyDown(surface, { key: 'ArrowRight' })
      expect(screen.getByTestId('detail').textContent).toBe('1')
      fireEvent.keyDown(surface, { key: 'ArrowLeft' })
      expect(screen.getByTestId('detail').textContent).toBe('null')
      if (reopen) {
        fireEvent.keyDown(surface, { key: 'ArrowRight' })
        expect(screen.getByTestId('detail').textContent).toBe('1')
      }
    })

    it('viewState reaches detail after two ArrowRight from list', async () => {
      const user = userEvent.setup()
      const surface = renderFocusedSurface([row(1)])
      await user.keyboard('{ArrowDown}')
      fireTwoRightsExpectSplitThenDetail(surface)
      expect(screen.getByTestId('detail').textContent).toBe('1')
    })

    it('ArrowDown keeps detail preview in sync after split to full detail via ArrowRight', async () => {
      const user = userEvent.setup()
      const surface = renderFocusedSurface([row(1), row(2), row(3)])
      await user.keyboard('{ArrowDown}')
      fireArrowKey(surface, 'ArrowRight')
      expectViewState('split')
      expect(screen.getByTestId('detail').textContent).toBe('1')
      fireArrowKey(surface, 'ArrowRight')
      expectViewState('detail')
      fireArrowKey(surface, 'ArrowRight')
      expectViewState('split')
      await user.keyboard('{ArrowDown}')
      expect(screen.getByTestId('selected').textContent).toBe('2')
      expect(screen.getByTestId('detail').textContent).toBe('2')
    })

    it('ArrowDown updates detail preview while split view is open', async () => {
      const user = userEvent.setup()
      const surface = renderFocusedSurface([row(1), row(2)])
      await user.keyboard('{ArrowDown}')
      fireEvent.keyDown(surface, { key: 'ArrowRight' })
      expect(screen.getByTestId('detail').textContent).toBe('1')
      await user.keyboard('{ArrowDown}')
      expect(screen.getByTestId('selected').textContent).toBe('2')
      expect(screen.getByTestId('detail').textContent).toBe('2')
    })

    it('ArrowRight auto-selects first row when nothing selected', () => {
      const rows = [row(7)]
      const surface = renderFocusedSurface(rows)
      fireEvent.keyDown(surface, { key: 'ArrowRight' })
      expect(screen.getByTestId('detail').textContent).toBe('7')
    })
  })

  describe('when navigating with ArrowUp/ArrowDown', () => {
    it('ArrowUp selects last row when none selected; ArrowDown moves from last', async () => {
      const rows = [row(1), row(2)]
      const user = userEvent.setup()
      renderFocusedSurface(rows)
      await user.keyboard('{ArrowUp}')
      expect(screen.getByTestId('selected').textContent).toBe('2')
      await user.keyboard('{ArrowDown}')
      expect(screen.getByTestId('selected').textContent).toBe('2')
    })

    it('ArrowUp on first row clears selection and invokes onLeaveListUpward', async () => {
      const onLeaveListUpward = mock(() => undefined)
      const rows = [row(1), row(2)]
      const user = userEvent.setup()
      renderFocusedSurface(rows, onLeaveListUpward)
      await user.keyboard('{ArrowDown}')
      expect(screen.getByTestId('selected').textContent).toBe('1')
      await user.keyboard('{ArrowUp}')
      expect(onLeaveListUpward).toHaveBeenCalledTimes(1)
      expect(screen.getByTestId('selected').textContent).toBe('null')
    })

    it('ArrowDown selects first row when none selected', async () => {
      const rows = [row(1), row(2)]
      const user = userEvent.setup()
      renderFocusedSurface(rows)
      await user.keyboard('{ArrowDown}')
      expect(screen.getByTestId('selected').textContent).toBe('1')
    })

    it('repeated ArrowDown moves by larger step', () => {
      const rows = [row(1), row(2), row(3), row(4), row(5), row(6)]
      const surface = renderFocusedSurface(rows)
      fireEvent.keyDown(surface, { key: 'ArrowDown' })
      fireEvent.keyDown(surface, { key: 'ArrowDown', repeat: true })
      expect(screen.getByTestId('selected').textContent).toBe('6')
    })
  })

  // Regression: in full detail the list panel is display:none, so arrows reach the
  // selection logic only via `window` capture (`useWindowViewNavKeys`), not the list
  // surface's `onKeyDown`. Selection and detail must keep updating without the list
  // surface holding focus. See `list_main.component.tsx`.
  describe('when navigating in full detail via window capture', () => {
    it('ArrowDown stays in full detail and advances selection + detail to row 2', () => {
      renderFullDetail([row(1), row(2), row(3)], 1)
      expect(screen.getByTestId('selected').textContent).toBe('1')
      expect(screen.getByTestId('detail').textContent).toBe('1')
      fireEvent.keyDown(document.body, { key: 'ArrowDown' })
      expectViewState('detail')
      expect(screen.getByTestId('selected').textContent).toBe('2')
      expect(screen.getByTestId('detail').textContent).toBe('2')
    })

    it('ArrowDown then ArrowUp from a middle row updates selection + detail in lockstep', () => {
      renderFullDetail([row(1), row(2), row(3), row(4), row(5)], 3)
      expect(screen.getByTestId('selected').textContent).toBe('3')
      expect(screen.getByTestId('detail').textContent).toBe('3')
      fireEvent.keyDown(document.body, { key: 'ArrowDown' })
      expect(screen.getByTestId('selected').textContent).toBe('4')
      expect(screen.getByTestId('detail').textContent).toBe('4')
      fireEvent.keyDown(document.body, { key: 'ArrowUp' })
      expectViewState('detail')
      expect(screen.getByTestId('selected').textContent).toBe('3')
      expect(screen.getByTestId('detail').textContent).toBe('3')
    })
  })
})
