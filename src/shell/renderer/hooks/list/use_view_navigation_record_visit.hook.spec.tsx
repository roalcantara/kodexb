/// <reference lib="dom" />

import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { RpcKnowledge } from '@shared/rpc'
import { rpcBookmarkRow } from '@testing'
import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'

const recordEntryVisitFireAndForget = mock<(id: number) => void>()

mock.module('../../utils/list/record_entry_visit.util', () => ({
  recordEntryVisitFireAndForget
}))

const { useViewNavigation } = await import('./use_view_navigation.hook')

function row(id: number): RpcKnowledge {
  return rpcBookmarkRow(id, `k${id}`)
}

function Harness({ rows }: { rows: RpcKnowledge[] }) {
  const [selectedId, setSelectedId] = useState<number | null>(rows[0]?.id ?? null)
  const [detailEntry, setDetailEntry] = useState<RpcKnowledge | null>(null)
  const { advance, selectDetailEntry, handleKey } = useViewNavigation({
    rows,
    selectedId,
    detailEntry,
    setSelectedId,
    setDetailEntry
  })

  return (
    <div>
      <div
        tabIndex={0}
        role="listbox"
        aria-label="Test list surface"
        data-testid="surface"
        onKeyDownCapture={e => {
          handleKey(e)
          if (e.defaultPrevented) e.stopPropagation()
        }}
      >
        surface
      </div>
      <button type="button" data-testid="advance" onClick={() => advance()}>
        advance
      </button>
      <button type="button" data-testid="select-2" onClick={() => selectDetailEntry(2)}>
        select 2
      </button>
    </div>
  )
}

describe('useViewNavigation recordEntryVisit', () => {
  beforeEach(() => {
    recordEntryVisitFireAndForget.mockReset()
  })

  it('records visit when advance opens detail from list', () => {
    render(<Harness rows={[row(1), row(2)]} />)
    fireEvent.click(screen.getByTestId('advance'))
    expect(recordEntryVisitFireAndForget).toHaveBeenCalledWith(1)
  })

  it('records visit when selectDetailEntry targets another row', () => {
    render(<Harness rows={[row(1), row(2)]} />)
    fireEvent.click(screen.getByTestId('select-2'))
    expect(recordEntryVisitFireAndForget).toHaveBeenCalledWith(2)
  })

  it('records visit after successful copy shortcut', async () => {
    function CopyHarness() {
      const [selectedId, setSelectedId] = useState<number | null>(1)
      const [detailEntry, setDetailEntry] = useState<RpcKnowledge | null>(null)
      const { handleKey } = useViewNavigation({
        rows: [row(1)],
        selectedId,
        detailEntry,
        setSelectedId,
        setDetailEntry,
        pushToast: () => undefined
      })
      return (
        <div
          onKeyDownCapture={e => {
            handleKey(e)
            if (e.defaultPrevented) e.stopPropagation()
          }}
        >
          <div tabIndex={0} role="listbox" aria-label="Test list surface" data-testid="surface" />
        </div>
      )
    }

    const writeText = mock(() => Promise.resolve())
    const prev = navigator.clipboard
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
      writable: true
    })
    try {
      render(<CopyHarness />)
      const surface = screen.getByTestId('surface')
      surface.focus()
      fireEvent.keyDown(surface, { key: 'c', metaKey: true, bubbles: true })
      await Promise.resolve()
      expect(recordEntryVisitFireAndForget).toHaveBeenCalledWith(1)
    } finally {
      Object.defineProperty(navigator, 'clipboard', { value: prev, configurable: true, writable: true })
    }
  })
})
