// @actions_system
import { beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import type { RpcKnowledge } from '@shared/rpc'
import { factoryFor, installEntryActionPanelDepsMock, installRecordEntryVisitMock, withMockClipboard } from '@testing'

installEntryActionPanelDepsMock()

const bookmark = factoryFor('bookmark', { overrides: { id: 42, key: 'https://example.com' } }) as RpcKnowledge

const actionCtx = {
  entry: bookmark,
  pushToast: () => undefined,
  onEditTask: () => undefined,
  onNewTask: () => undefined,
  onSync: () => undefined,
  onOpenSettings: () => undefined
}

let executeEntryAction: (entry: RpcKnowledge, actionId: string, ctx: typeof actionCtx) => Promise<void>
let recordEntryVisitFireAndForget: ReturnType<typeof installRecordEntryVisitMock>

describe('executeEntryAction()', () => {
  beforeAll(async () => {
    recordEntryVisitFireAndForget = installRecordEntryVisitMock()
    const mod = await import('./execute.executor')
    executeEntryAction = mod.executeEntryAction
  })

  beforeEach(() => {
    recordEntryVisitFireAndForget.mockReset()
  })

  describe('when copy succeeds', () => {
    it('records visit', async () => {
      await withMockClipboard(
        () => Promise.resolve(),
        async () => {
          await executeEntryAction(bookmark, 'copy', actionCtx)
          expect(recordEntryVisitFireAndForget).toHaveBeenCalledWith(42)
        }
      )
    })
  })

  describe('when copy fails', () => {
    it('does not record visit', async () => {
      await withMockClipboard(
        () => Promise.reject(new Error('denied')),
        async () => {
          await executeEntryAction(bookmark, 'copy', actionCtx).catch(() => undefined)
          expect(recordEntryVisitFireAndForget).not.toHaveBeenCalled()
        }
      )
    })
  })
})
