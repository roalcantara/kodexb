/// <reference lib="dom" />

import { beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import type { RpcKnowledge } from '@shared/rpc'
import { factoryFor } from '@testing'
import {
  installEntryActionPanelDepsMock,
  installRecordEntryVisitMock,
  withMockClipboard
} from './entry_action_spec_setup.util'

installEntryActionPanelDepsMock()

const bookmark = factoryFor('bookmark', { overrides: { id: 42, key: 'https://example.com' } }) as RpcKnowledge

const actionCtx = {
  entry: bookmark,
  pushToast: () => undefined,
  onEditTask: () => undefined,
  onNewTask: () => undefined,
  onSync: () => undefined
}

let executeEntryAction: (entry: RpcKnowledge, actionId: string, ctx: typeof actionCtx) => Promise<void>
let recordEntryVisitFireAndForget: ReturnType<typeof installRecordEntryVisitMock>

describe('executeEntryAction()', () => {
  beforeAll(async () => {
    recordEntryVisitFireAndForget = installRecordEntryVisitMock()
    const mod = await import('./execute_entry_action.util')
    executeEntryAction = mod.executeEntryAction
  })

  beforeEach(() => {
    recordEntryVisitFireAndForget.mockReset()
  })

  test('records visit after successful copy', async () => {
    await withMockClipboard(
      () => Promise.resolve(),
      async () => {
        await executeEntryAction(bookmark, 'copy', actionCtx)
        expect(recordEntryVisitFireAndForget).toHaveBeenCalledWith(42)
      }
    )
  })

  test('does not record visit when copy fails', async () => {
    await withMockClipboard(
      () => Promise.reject(new Error('denied')),
      async () => {
        await executeEntryAction(bookmark, 'copy', actionCtx).catch(() => undefined)
        expect(recordEntryVisitFireAndForget).not.toHaveBeenCalled()
      }
    )
  })
})
