import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import type { RpcKnowledge } from '@shared/rpc'
import { rpcBookmarkRow } from '@testing'
import { cleanup, render } from '@testing-library/react'

const recordEntryVisitFireAndForget = mock<(id: number) => void>()

mock.module('../../utils/list/list_frecency.util', () => ({
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

  describe('when detail entry id changes', () => {
    it('records visit for new entry', () => {
      const { rerender } = render(<Harness entry={rpcBookmarkRow(1)} />)
      expect(recordEntryVisitFireAndForget).toHaveBeenCalledWith(1)
      recordEntryVisitFireAndForget.mockReset()
      rerender(<Harness entry={rpcBookmarkRow(2)} />)
      expect(recordEntryVisitFireAndForget).toHaveBeenCalledWith(2)
    })
  })

  describe('when detail entry id does not change', () => {
    it('does not record again', () => {
      const row = rpcBookmarkRow(1)
      const { rerender } = render(<Harness entry={row} />)
      expect(recordEntryVisitFireAndForget).toHaveBeenCalledTimes(1)
      rerender(<Harness entry={row} />)
      expect(recordEntryVisitFireAndForget).toHaveBeenCalledTimes(1)
    })
  })
})
