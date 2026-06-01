import { describe, expect, it } from 'bun:test'

import { INVOKE_ROUTE_DEFAULT_FAILURE_STATUS, invokeRoute } from './invoke_route.util'

describe('invokeRoute', () => {
  describe('when the run callback succeeds', () => {
    it('returns the value and leaves status unset', async () => {
      const set: { status?: number | string } = {}
      const result = await invokeRoute(set, () => ({ ok: true }))
      expect(result).toEqual({ ok: true })
      expect(set.status).toBeUndefined()
    })

    it('awaits async results', async () => {
      const set: { status?: number | string } = {}
      const result = await invokeRoute(set, async () => 'done')
      expect(result).toBe('done')
      expect(set.status).toBeUndefined()
    })
  })

  describe('when the run callback throws', () => {
    it('uses the default failure status and returns a stringified error', async () => {
      const set: { status?: number | string } = {}
      const result = await invokeRoute(set, () => {
        throw new Error('route failed')
      })
      expect(set.status).toBe(INVOKE_ROUTE_DEFAULT_FAILURE_STATUS)
      expect(result).toEqual({ error: 'Error: route failed' })
    })

    it('honours a custom failure status', async () => {
      const set: { status?: number | string } = {}
      const result = await invokeRoute(
        set,
        () => {
          throw new Error('conflict')
        },
        { failureStatus: 409 }
      )
      expect(set.status).toBe(409)
      expect(result).toEqual({ error: 'Error: conflict' })
    })
  })
})
