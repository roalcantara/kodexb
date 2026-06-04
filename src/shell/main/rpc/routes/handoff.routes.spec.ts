import { describe, expect, it } from 'bun:test'
import { mountRouteModule, rpcSpecPostJson, setupRpcRouteSpecSuite } from '@testing'
import { runRoute } from '@testing/helpers/run_route.util'
import type { AppShellHooks } from '../../../app/lib/app_shell_hooks.types'
import { handoffRoutes } from './handoff.routes'

describe('handoffRoutes', () => {
  const { postViaRoutes, memoryApp, recordingTerminalShellHook, throwingShellHook } = setupRpcRouteSpecSuite()

  async function postHandoff<T>(
    hooks: AppShellHooks,
    path: string,
    body: unknown
  ): Promise<{ status: number; data: T }> {
    const rpc = mountRouteModule(memoryApp(hooks), handoffRoutes)
    return await runRoute<T>(() => rpc.handle(rpcSpecPostJson(path, body)))
  }

  describe('POST /api/openExternal', () => {
    const body = { url: 'https://example.com' }

    it('opens the URL externally', () => {
      const opened: string[] = []
      expect(
        postHandoff<void>({ openExternal: url => opened.push(url) }, '/api/openExternal', body)
      ).resolves.toMatchObject({
        status: 200
      })
      expect(opened).toEqual(['https://example.com/'])
    })

    describe('when url is empty', () => {
      it('returns 500', () => {
        expect(postViaRoutes(handoffRoutes, '/api/openExternal', { url: '' })).resolves.toMatchObject({
          status: 500
        })
      })
    })

    describe('when the hook throws', () => {
      it('returns 422 with an error message', () => {
        expect(
          postHandoff<{ error: string }>(
            {
              openExternal: () => {
                throw new Error('browser unavailable')
              }
            },
            '/api/openExternal',
            body
          )
        ).resolves.toMatchObject({
          status: 422,
          data: { error: expect.stringContaining('browser unavailable') }
        })
      })
    })
  })

  describe('POST /api/pasteInTerminal', () => {
    it('pastes the command in the terminal', () => {
      const calls: [string, string | undefined][] = []
      expect(
        postHandoff<void>(recordingTerminalShellHook('pasteInTerminal', calls), '/api/pasteInTerminal', { cmd: 'ls' })
      ).resolves.toMatchObject({
        status: 200
      })
      expect(calls).toEqual([['ls', undefined]])
    })

    describe('when the hook throws', () => {
      it('returns 422 with an error message', () => {
        expect(
          postHandoff<{ error: string }>(throwingShellHook('pasteInTerminal', 'no terminal'), '/api/pasteInTerminal', {
            cmd: 'ls'
          })
        ).resolves.toMatchObject({
          status: 422,
          data: { error: expect.stringContaining('no terminal') }
        })
      })
    })
  })

  describe('POST /api/runInTerminal', () => {
    it('runs the command in the terminal', () => {
      const calls: [string, string | undefined][] = []
      expect(
        postHandoff<void>(recordingTerminalShellHook('runInTerminal', calls), '/api/runInTerminal', { cmd: 'ls -la' })
      ).resolves.toMatchObject({
        status: 200
      })
      expect(calls).toEqual([['ls -la', undefined]])
    })

    describe('when the hook throws', () => {
      it('returns 422 with an error message', () => {
        expect(
          postHandoff<{ error: string }>(throwingShellHook('runInTerminal', 'run fail'), '/api/runInTerminal', {
            cmd: 'ls'
          })
        ).resolves.toMatchObject({
          status: 422,
          data: { error: expect.stringContaining('run fail') }
        })
      })
    })
  })

  describe('POST /api/pasteDoc', () => {
    const body = { doc: 'some content' }

    it('pastes the document to the frontmost app', () => {
      const pasted: string[] = []
      expect(postHandoff<void>({ pasteDoc: doc => pasted.push(doc) }, '/api/pasteDoc', body)).resolves.toMatchObject({
        status: 200
      })
      expect(pasted).toEqual(['some content'])
    })

    describe('when the hook throws', () => {
      it('returns 422 with an error message', () => {
        expect(
          postHandoff<{ error: string }>(
            {
              pasteDoc: () => {
                throw new Error('paste fail')
              }
            },
            '/api/pasteDoc',
            body
          )
        ).resolves.toMatchObject({
          status: 422,
          data: { error: expect.stringContaining('paste fail') }
        })
      })
    })
  })

  describe('POST /api/openInEditor', () => {
    const body = { filePath: '/tmp/test.md', editorApp: 'Code' }

    it('opens the file in the editor', () => {
      const opened: [string, string | undefined][] = []
      expect(
        postHandoff<void>(
          { openInEditor: (filePath, editorApp) => opened.push([filePath, editorApp]) },
          '/api/openInEditor',
          body
        )
      ).resolves.toMatchObject({
        status: 200
      })
      expect(opened).toEqual([['/tmp/test.md', undefined]])
    })

    describe('when the hook throws', () => {
      it('returns 422 with an error message', () => {
        expect(
          postHandoff<{ error: string }>(
            {
              openInEditor: () => {
                throw new Error('editor fail')
              }
            },
            '/api/openInEditor',
            body
          )
        ).resolves.toMatchObject({
          status: 422,
          data: { error: expect.stringContaining('editor fail') }
        })
      })
    })
  })
})
