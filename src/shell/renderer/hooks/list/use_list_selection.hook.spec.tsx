/// <reference lib="dom" />

import { expect, mock, test } from 'bun:test'
import type { RpcKnowledge } from '@shared/rpc'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import type { ListSelectionLayout } from './use_list_selection.hook'
import { useListSelection } from './use_list_selection.hook'

function Harness({
  rows,
  layout,
  onLeaveListUpward
}: {
  rows: RpcKnowledge[]
  layout?: ListSelectionLayout
  onLeaveListUpward?: () => void
}) {
  const sel = useListSelection(rows, layout, onLeaveListUpward)
  return (
    <div tabIndex={0} data-testid="list-surface" onKeyDown={sel.onListKeyDown} role="listbox" aria-label="Test list">
      <span data-testid="selected">{sel.selectedId ?? 'null'}</span>
      <span data-testid="detail">{sel.detailEntry?.id ?? 'null'}</span>
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

function renderFocusedSurface(
  rows: RpcKnowledge[],
  layout?: ListSelectionLayout,
  onLeaveListUpward?: () => void
): HTMLElement {
  render(<Harness rows={rows} layout={layout} onLeaveListUpward={onLeaveListUpward} />)
  const surface = screen.getByTestId('list-surface')
  surface.focus()
  return surface
}

test('Escape clears detail and calls layout.onDetailClose when detail is open', async () => {
  const onDetailClose = mock(() => undefined)
  const rows = [row(1), row(2)]
  const user = userEvent.setup()
  renderFocusedSurface(rows, { onFirstDetailOpen: mock(), onDetailClose })
  await user.keyboard('{ArrowUp}')
  await user.keyboard('{Enter}')
  expect(screen.getByTestId('detail').textContent).toBe('1')
  await user.keyboard('{Escape}')
  expect(screen.getByTestId('detail').textContent).toBe('null')
  expect(onDetailClose).toHaveBeenCalledTimes(1)
})

test('Enter opens detail, calls onFirstDetailOpen once; Enter again closes and calls onDetailClose', async () => {
  const onFirstDetailOpen = mock(() => undefined)
  const onDetailClose = mock(() => undefined)
  const rows = [row(10)]
  const user = userEvent.setup()
  renderFocusedSurface(rows, { onFirstDetailOpen, onDetailClose })
  await user.keyboard('{ArrowUp}')
  expect(screen.getByTestId('selected').textContent).toBe('10')
  await user.keyboard('{Enter}')
  expect(screen.getByTestId('detail').textContent).toBe('10')
  expect(onFirstDetailOpen).toHaveBeenCalledTimes(1)
  await user.keyboard('{Enter}')
  expect(screen.getByTestId('detail').textContent).toBe('null')
  expect(onDetailClose).toHaveBeenCalledTimes(1)
})

test('ArrowUp selects first row when none selected; ArrowDown moves to next row', async () => {
  const rows = [row(1), row(2)]
  const user = userEvent.setup()
  renderFocusedSurface(rows)
  await user.keyboard('{ArrowUp}')
  expect(screen.getByTestId('selected').textContent).toBe('1')
  await user.keyboard('{ArrowDown}')
  expect(screen.getByTestId('selected').textContent).toBe('2')
})

test('ArrowUp on first row with onLeaveListUpward clears selection and invokes callback', async () => {
  const onLeaveListUpward = mock(() => undefined)
  const rows = [row(1), row(2)]
  const user = userEvent.setup()
  renderFocusedSurface(rows, undefined, onLeaveListUpward)
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

test('ArrowRight opens detail and ArrowLeft closes it', async () => {
  const onFirstDetailOpen = mock(() => undefined)
  const onDetailClose = mock(() => undefined)
  const rows = [row(1)]
  const user = userEvent.setup()
  renderFocusedSurface(rows, { onFirstDetailOpen, onDetailClose })
  await user.keyboard('{ArrowDown}')
  await user.keyboard('{ArrowRight}')
  expect(screen.getByTestId('detail').textContent).toBe('1')
  expect(onFirstDetailOpen).toHaveBeenCalledTimes(1)
  await user.keyboard('{ArrowLeft}')
  expect(screen.getByTestId('detail').textContent).toBe('null')
  expect(onDetailClose).toHaveBeenCalledTimes(1)
})

test.each([
  { name: 'Meta+[', mods: { metaKey: true } as const },
  { name: 'Ctrl+[', mods: { ctrlKey: true } as const }
])('$name closes detail and calls onDetailClose', ({ mods }) => {
  const onDetailClose = mock(() => undefined)
  const rows = [row(1)]
  renderFocusedSurface(rows, { onFirstDetailOpen: mock(), onDetailClose })
  const surface = screen.getByTestId('list-surface')
  surface.focus()
  fireEvent.keyDown(surface, { key: 'ArrowUp' })
  fireEvent.keyDown(surface, { key: 'Enter' })
  expect(screen.getByTestId('detail').textContent).toBe('1')
  fireEvent.keyDown(surface, { key: '[', ...mods })
  expect(screen.getByTestId('detail').textContent).toBe('null')
  expect(onDetailClose).toHaveBeenCalledTimes(1)
})

test('repeated ArrowDown moves by larger step', () => {
  const rows = [row(1), row(2), row(3), row(4), row(5), row(6)]
  const surface = renderFocusedSurface(rows)
  fireEvent.keyDown(surface, { key: 'ArrowDown' })
  fireEvent.keyDown(surface, { key: 'ArrowDown', repeat: true })
  expect(screen.getByTestId('selected').textContent).toBe('6')
})

test('Enter with no selection does not open detail', async () => {
  const rows = [row(7)]
  const user = userEvent.setup()
  renderFocusedSurface(rows)
  await user.keyboard('{Enter}')
  expect(screen.getByTestId('detail').textContent).toBe('null')
  expect(screen.getByTestId('selected').textContent).toBe('null')
})
