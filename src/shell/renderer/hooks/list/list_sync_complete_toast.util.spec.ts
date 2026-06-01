import { describe, expect, it } from 'bun:test'
import type { RpcImportResult } from '@shared/rpc'
import { syncCompleteToastForResult } from './list_sync_complete_toast.util'

const base: RpcImportResult = { filesProcessed: 1, inserted: 1, updated: 0, errors: [], warnings: [], fileLog: [] }

describe('syncCompleteToastForResult', () => {
  describe('when sync completes', () => {
    describe('when modal is open', () => {
      describe('when sync is clean', () => {
        it('does not show toast', () => {
          expect(syncCompleteToastForResult(base, true)).toBeNull()
        })
      })
      describe('when sync has warnings', () => {
        it('shows toast: "Sync finished with 1 collision warning(s)."', () => {
          const result = { ...base, warnings: ['hard collision: cmd+space'] }
          expect(syncCompleteToastForResult(result, true)).toEqual({
            message: 'Sync finished with 1 collision warning(s).',
            type: 'error'
          })
        })
      })
    })
    describe('when modal is closed', () => {
      describe('when sync is clean', () => {
        it('shows toast: "Sync finished."', () => {
          expect(syncCompleteToastForResult(base, false)).toEqual({ message: 'Sync finished.', type: 'success' })
        })
      })
      describe('when sync has warnings', () => {
        it('shows toast: "Sync finished with 1 collision warning(s)."', () => {
          const result = { ...base, warnings: ['hard collision: cmd+space'] }
          expect(syncCompleteToastForResult(result, false)).toEqual({
            message: 'Sync finished with 1 collision warning(s).',
            type: 'error'
          })
        })
      })
    })
  })
})
