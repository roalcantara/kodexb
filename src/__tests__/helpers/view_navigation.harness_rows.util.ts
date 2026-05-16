import type { RpcKnowledge } from '@shared/rpc'
import { rpcBookmarkRow } from './rpc_knowledge_test_row.util'

export function viewNavBookmarkRow(id: number): RpcKnowledge {
  return rpcBookmarkRow(id, `k${id}`)
}
