import { describe, expect, it } from 'bun:test'

import { shellRoutes } from './shell.routes'
import { setupRpcRouteSpecSuite } from './utils/rpc_route_spec.util'

describe('shellRoutes', () => {
  const { postDefaultShellViaRoutes, shellHookViaRoutes } = setupRpcRouteSpecSuite()

  describe('POST /api/resizeWindow', () => {
    const w = 1200
    const h = 700
    it('resizes the window', async () => {
      const calls: Array<{ width: number; height: number }> = []
      const res = await shellHookViaRoutes(
        shellRoutes,
        { resizeWindow: (width, height) => calls.push({ width, height }) },
        '/api/resizeWindow',
        { width: w, height: h }
      )
      expect(res.status).toBe(200)
      expect(calls).toEqual([{ width: w, height: h }])
    })

    describe.each([
      ['hook is missing', { width: w, height: h }],
      ['body is invalid', { width: 'not a number', height: h }],
      ['body is missing a required field', { width: w }]
    ])('when the %s', (_desc, body) => {
      it('returns 500', async () => {
        const res = await postDefaultShellViaRoutes(shellRoutes, '/api/resizeWindow', body)
        expect(res.status).toBe(500)
      })
    })
  })

  describe('POST /api/setWindowPosition', () => {
    const w = 220
    const h = 330
    it('sets the window position', async () => {
      const calls: Array<{ x: number; y: number }> = []
      const res = await shellHookViaRoutes(
        shellRoutes,
        { setWindowPosition: (x, y) => calls.push({ x, y }) },
        '/api/setWindowPosition',
        { x: w, y: h }
      )
      expect(res.status).toBe(200)
      expect(calls).toEqual([{ x: w, y: h }])
    })

    describe.each([
      ['hook is missing', { x: w, y: h }, 200, '200 as a no-op'],
      ['body is invalid', { x: 'not a number', y: h }, 500, '500'],
      ['body is missing a required field', { x: w }, 500, '500']
    ])('when the %s', (_desc, body, expectedStatus, testDesc) => {
      it(`return ${testDesc}`, async () => {
        const res = await postDefaultShellViaRoutes(shellRoutes, '/api/setWindowPosition', body)
        expect(res.status).toBe(expectedStatus)
      })
    })
  })

  describe('POST /api/getWindowPosition', () => {
    const x = 42
    const y = 84
    it('returns the window position', async () => {
      const res = await shellHookViaRoutes(
        shellRoutes,
        { getWindowPosition: () => ({ x, y }) },
        '/api/getWindowPosition',
        {}
      )
      expect(res.status).toBe(200)
      const data = (await res.json()) as { x: number; y: number }
      expect(data).toEqual({ x, y })
    })

    describe('when the hook is missing', () => {
      it('returns a null-equivalent body', async () => {
        const res = await postDefaultShellViaRoutes(shellRoutes, '/api/getWindowPosition', {})
        expect(res.status).toBe(200)
        // Elysia serialises a `null` return as an empty body; the renderer
        // bridge (`bridgeFetch` in `src/shell/renderer/rpc/client.ts`)
        // promotes it back to `null` before Eden Treaty parses. Both
        // representations are valid on the wire here.
        const text = await res.text()
        expect(text === '' || text === 'null').toBe(true)
      })
    })

    describe('when the body contains extra properties', () => {
      it('ignores the body and returns 200', async () => {
        const res = await postDefaultShellViaRoutes(shellRoutes, '/api/getWindowPosition', { x: 1, y: 2 })
        expect(res.status).toBe(200)
      })
    })
  })

  describe('POST /api/quit', () => {
    it('quits the app', async () => {
      let calls = 0
      const res = await shellHookViaRoutes(
        shellRoutes,
        {
          quit: () => {
            calls += 1
          }
        },
        '/api/quit',
        {}
      )
      expect(res.status).toBe(200)
      expect(calls).toBe(1)
    })

    describe('when the hook is missing', () => {
      it('returns 200 as a no-op', async () => {
        const res = await postDefaultShellViaRoutes(shellRoutes, '/api/quit', {})
        expect(res.status).toBe(200)
      })
    })
  })
})
