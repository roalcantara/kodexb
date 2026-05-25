import { afterEach, describe, expect, it, mock } from 'bun:test'

import { factoryFor } from '@testing'
import {
  buildBrowserWindowCreateOptions,
  computeInitialFrameFromDisplay,
  createDeferredSyncEmit,
  createShellHooks,
  MAIN_WINDOW_DEFAULT_SIZE,
  MAIN_WINDOW_RENDERER_URL
} from './shell_hooks.util'
import { SAFE_FALLBACK_X, SAFE_FALLBACK_Y } from './window/placement.util'

describe('computeInitialFrameFromDisplay', () => {
  afterEach(() => {
    mock.restore()
  })

  describe('when the primary display work area is missing', () => {
    it('logs a fallback hint and returns the safe frame', () => {
      const debug = mock((_args: unknown[]) => undefined)
      const frame = computeInitialFrameFromDisplay(null, { debug }, MAIN_WINDOW_DEFAULT_SIZE)
      expect(debug).toHaveBeenCalledTimes(1)
      expect(frame).toEqual(
        factoryFor('rectangle', {
          overrides: {
            x: SAFE_FALLBACK_X,
            y: SAFE_FALLBACK_Y,
            width: MAIN_WINDOW_DEFAULT_SIZE.width,
            height: MAIN_WINDOW_DEFAULT_SIZE.height
          }
        })
      )
    })
  })

  describe('when the work area is usable', () => {
    it('centers the default window size', () => {
      const workArea = factoryFor('rectangle', { overrides: { x: 0, y: 25, width: 1440, height: 875 } })
      const debug = mock((_args: unknown[]) => undefined)
      const frame = computeInitialFrameFromDisplay({ workArea } as never, { debug }, MAIN_WINDOW_DEFAULT_SIZE)
      expect(debug).not.toHaveBeenCalled()
      expect(frame.width).toBe(MAIN_WINDOW_DEFAULT_SIZE.width)
      expect(frame.height).toBe(MAIN_WINDOW_DEFAULT_SIZE.height)
    })
  })
})

describe('createDeferredSyncEmit', () => {
  it('no-ops when the webview RPC is not ready', () => {
    const mkSyncEmitter = mock((_rpc: unknown) => ({
      syncProgress: mock(() => undefined),
      syncComplete: mock(() => undefined)
    }))
    const emit = createDeferredSyncEmit(() => null, mkSyncEmitter)
    emit.syncProgress({ processed: 1, total: 2 })
    expect(mkSyncEmitter).not.toHaveBeenCalled()
  })

  it('forwards sync events through the sync emitter', () => {
    const syncProgress = mock((_payload: unknown) => undefined)
    const syncComplete = mock((_result: unknown) => undefined)
    const rpc = { id: 'rpc-1' }
    const mkSyncEmitter = mock(() => ({ syncProgress, syncComplete }))
    const emit = createDeferredSyncEmit(() => rpc, mkSyncEmitter)
    const payload = { processed: 2, total: 5 }
    const result = { filesProcessed: 5, inserted: 1, updated: 0, errors: [] as string[] }
    emit.syncProgress(payload)
    emit.syncComplete(result)
    expect(mkSyncEmitter).toHaveBeenCalledWith(rpc)
    expect(syncProgress).toHaveBeenCalledWith(payload)
    expect(syncComplete).toHaveBeenCalledWith(result)
  })
})

describe('createShellHooks', () => {
  const win = {
    setSize: mock((_w: number, _h: number) => undefined),
    minimize: mock(() => undefined)
  }

  afterEach(() => {
    mock.restore()
  })

  it('resizes and minimizes the window when present', () => {
    const hooks = createShellHooks(() => win, {
      openExternal: mock(() => undefined),
      openFileDialog: async () => []
    })
    hooks.resizeWindow?.(800, 600)
    hooks.hideWindow?.()
    expect(win.setSize).toHaveBeenCalledWith(800, 600)
    expect(win.minimize).toHaveBeenCalledTimes(1)
  })

  it('maps showOpenDialog to Utils.openFileDialog shape', async () => {
    const openFileDialog = mock(async () => ['/picked/file.md'])
    const hooks = createShellHooks(() => null, {
      openExternal: mock(() => undefined),
      openFileDialog
    })
    const path = await hooks.showOpenDialog?.({
      defaultPath: '/tmp',
      properties: ['openFile']
    })
    expect(path).toBe('/picked/file.md')
    expect(openFileDialog).toHaveBeenCalledWith({
      startingFolder: '/tmp',
      canChooseFiles: true,
      canChooseDirectory: false,
      allowsMultipleSelection: false
    })
  })

  it('opens absolute editor paths as file:// URLs', () => {
    const openExternal = mock((_url: string) => undefined)
    const hooks = createShellHooks(() => null, { openExternal, openFileDialog: async () => [] })
    hooks.openInEditor?.('/tmp/note.md', 'Code')
    expect(openExternal).toHaveBeenCalledWith('file:///tmp/note.md')
  })
})

describe('buildBrowserWindowCreateOptions', () => {
  const frame = factoryFor('rectangle')
  const rpc = { transport: 'test' }

  it('targets the packaged shell renderer', () => {
    const opts = buildBrowserWindowCreateOptions(frame, rpc, 'linux')
    expect(opts.url).toBe(MAIN_WINDOW_RENDERER_URL)
    expect(opts.frame).toEqual(frame)
    expect(opts.rpc).toBe(rpc)
    expect(opts.transparent).toBe(true)
  })

  describe('by platform', () => {
    it('uses a hidden title bar on macOS', () => {
      expect(buildBrowserWindowCreateOptions(frame, rpc, 'darwin').titleBarStyle).toBe('hidden')
    })

    it('uses the default title bar elsewhere', () => {
      expect(buildBrowserWindowCreateOptions(frame, rpc, 'win32').titleBarStyle).toBe('default')
    })
  })
})
