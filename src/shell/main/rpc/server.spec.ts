import { describe, expect, it } from 'bun:test'

import { RPC_SPEC_API_BASE, rpcSpecPostJson, setupRpcRouteSpecSuite } from '@testing'
import { createRpcServer } from './server'

describe('createRpcServer', () => {
  const { importedApp, handleFullRpc } = setupRpcRouteSpecSuite()

  describe('when composing route modules', () => {
    it('mounts catalog routes under /api', async () => {
      const rpc = createRpcServer(await importedApp())
      const res = await rpc.handle(rpcSpecPostJson('/api/list', {}))
      expect(res.status).toBe(200)
    })
  })

  describe('when an unknown route is requested', () => {
    it('does not match list and falls through', async () => {
      const res = await handleFullRpc(rpcSpecPostJson('/api/totallyUnknown', {}))
      expect(res.status).not.toBe(200)
    })
  })

  describe('when the request has no Content-Type', () => {
    it('treats /list as valid with an empty body', async () => {
      const res = await handleFullRpc(
        new Request(`${RPC_SPEC_API_BASE}/list`, { method: 'POST', body: JSON.stringify({}) })
      )
      expect(res.status).toBe(200)
    })
  })
})
