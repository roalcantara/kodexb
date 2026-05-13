/// <reference lib="dom" />

import { expect, test } from 'bun:test'
import type { RpcKnowledge } from '@shared/rpc'
import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'

import { useViewNavigation } from './use_view_navigation.hook'

function row(id: number): RpcKnowledge {
  return {
    type: 'bookmark',
    id,
    key: `k${id}`,
    source: 'fixtures/t.yaml',
    desc: '',
    tags: [],
    doc: '',
    createdAt: 0,
    updatedAt: 0
  }
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

  fireEvent.keyDown(surface, { key: 'ArrowRight' })
  expect(screen.getByTestId('view-state').textContent).toBe('split')

  fireEvent.keyDown(surface, { key: 'ArrowRight' })
  expect(screen.getByTestId('view-state').textContent).toBe('detail')
  expect(screen.getByTestId('detail-id').textContent).toBe('1')

  fireEvent.keyDown(surface, { key: 'ArrowLeft' })
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
