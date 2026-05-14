import type { RpcKnowledge } from '@shared/rpc'
import { factoryFor } from '../factories/factories.builder'

/** Minimal bookmark list row for renderer hook/component specs (explicit id + key). */
export function rpcBookmarkRow(id: number, key = `k${id}`): RpcKnowledge {
  return factoryFor('bookmark', {
    overrides: {
      id,
      key,
      source: 'fixtures/t.yaml',
      desc: 'row',
      tags: ['t'],
      doc: '',
      createdAt: 0,
      updatedAt: 0
    }
  }) as RpcKnowledge
}
