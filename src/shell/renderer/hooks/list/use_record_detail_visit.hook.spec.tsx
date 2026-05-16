import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import type { RpcKnowledge } from '@shared/rpc'
import { rpcBookmarkRow } from '@testing'
import { cleanup, render } from '@testing-library/react'

const recordEntryVisitFireAndForget = mock<(id: number) => void>()

mock.module('../../utils/list/record_entry_visit.util', () => ({
  recordEntryVisitFireAndForget
}))

const { useRecordDetailVisit } = await import('./use_record_detail_visit.hook')

function Harness({ entry }: { entry: RpcKnowledge | null }) {
  useRecordDetailVisit(entry)
  return null
}

describe('useRecordDetailVisit', () => {
  beforeEach(() => {
    recordEntryVisitFireAndForget.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  test('records visit when detail entry id is set', () => {
    const { rerender } = render(<Harness entry={rpcBookmarkRow(1)} />)
    expect(recordEntryVisitFireAndForget).toHaveBeenCalledWith(1)
    recordEntryVisitFireAndForget.mockReset()
    rerender(<Harness entry={rpcBookmarkRow(2)} />)
    expect(recordEntryVisitFireAndForget).toHaveBeenCalledWith(2)
  })

  test('does not record again for the same id', () => {
    const row = rpcBookmarkRow(1)
    const { rerender } = render(<Harness entry={row} />)
    expect(recordEntryVisitFireAndForget).toHaveBeenCalledTimes(1)
    rerender(<Harness entry={row} />)
    expect(recordEntryVisitFireAndForget).toHaveBeenCalledTimes(1)
  })
})
