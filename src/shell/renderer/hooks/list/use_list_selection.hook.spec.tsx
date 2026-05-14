/// <reference lib="dom" />

import { expect, mock, test } from 'bun:test'
import type { RpcKnowledge } from '@shared/rpc'
import { fireTwoRightsExpectSplitThenDetail } from '@testing'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { useListSelection } from './use_list_selection.hook'

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
  return {
    type: 'bookmark',
    id,
    key,
    source: 'fixtures/t.yaml',
    desc: '',
    tags: [],
    doc: '',
    createdAt: 0,
    updatedAt: 0
  }
}

function renderFocusedSurface(rows: RpcKnowledge[], onLeaveListUpward?: () => void): HTMLElement {
  render(<Harness rows={rows} onLeaveListUpward={onLeaveListUpward} />)
  const surface = screen.getByTestId('list-surface')
  surface.focus()
  return surface
}

test.each([
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

test('viewState reaches detail after two ArrowRight from list', async () => {
  const user = userEvent.setup()
  const surface = renderFocusedSurface([row(1)])
  await user.keyboard('{ArrowDown}')
  fireTwoRightsExpectSplitThenDetail(surface)
  expect(screen.getByTestId('detail').textContent).toBe('1')
})

test('ArrowRight auto-selects first row when nothing selected', () => {
  const rows = [row(7)]
  const surface = renderFocusedSurface(rows)
  fireEvent.keyDown(surface, { key: 'ArrowRight' })
  expect(screen.getByTestId('detail').textContent).toBe('7')
})

test('ArrowUp selects last row when none selected; ArrowDown moves from last row', async () => {
  const rows = [row(1), row(2)]
  const user = userEvent.setup()
  renderFocusedSurface(rows)
  await user.keyboard('{ArrowUp}')
  expect(screen.getByTestId('selected').textContent).toBe('2')
  await user.keyboard('{ArrowDown}')
  expect(screen.getByTestId('selected').textContent).toBe('2') // already at last row
})

test('ArrowUp on first row with onLeaveListUpward clears selection and invokes callback', async () => {
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

test('ArrowDown selects first row when none selected', async () => {
  const rows = [row(1), row(2)]
  const user = userEvent.setup()
  renderFocusedSurface(rows)
  await user.keyboard('{ArrowDown}')
  expect(screen.getByTestId('selected').textContent).toBe('1')
})

test('repeated ArrowDown moves by larger step', () => {
  const rows = [row(1), row(2), row(3), row(4), row(5), row(6)]
  const surface = renderFocusedSurface(rows)
  fireEvent.keyDown(surface, { key: 'ArrowDown' })
  fireEvent.keyDown(surface, { key: 'ArrowDown', repeat: true })
  expect(screen.getByTestId('selected').textContent).toBe('6')
})
