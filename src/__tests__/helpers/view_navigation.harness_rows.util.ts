import type { Knowledge } from '@core'
import { rpcBookmarkRow } from './rpc_knowledge_test_row.util'

export function viewNavBookmarkRow(id: number): Knowledge {
  return rpcBookmarkRow(id, `k${id}`)
}
