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
      const debug = mock((_message: string) => undefined)
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
      const debug = mock((_message: string) => undefined)
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
    const result = { filesProcessed: 5, inserted: 1, updated: 0, errors: [] as string[], warnings: [] as string[] }
    emit.syncProgress(payload)
    emit.syncComplete(result)
    expect(mkSyncEmitter).toHaveBeenCalledWith(rpc)
    expect(syncProgress).toHaveBeenCalledWith(payload)
    expect(syncComplete).toHaveBeenCalledWith(result)
  })
})

describe('createShellHooks', () => {
  function makeWin(position = { x: 0, y: 0 }) {
    return {
      setSize: mock((_w: number, _h: number) => undefined),
      minimize: mock(() => undefined),
      getPosition: mock(() => position),
      setPosition: mock((_x: number, _y: number) => undefined)
    }
  }

  afterEach(() => {
    mock.restore()
  })

  it('resizes and minimizes the window when present', () => {
    const win = makeWin()
    const hooks = createShellHooks(() => win, {
      openExternal: mock(() => undefined),
      openFileDialog: async () => []
    })
    hooks.resizeWindow?.(800, 600)
    hooks.hideWindow?.()
    expect(win.setSize).toHaveBeenCalledWith(800, 600)
    expect(win.minimize).toHaveBeenCalledTimes(1)
  })

  describe('window position hooks', () => {
    it('reads the native window position', () => {
      const win = makeWin({ x: 120, y: 240 })
      const hooks = createShellHooks(() => win, {
        openExternal: mock(() => undefined),
        openFileDialog: async () => []
      })
      expect(hooks.getWindowPosition?.()).toEqual({ x: 120, y: 240 })
      expect(win.getPosition).toHaveBeenCalledTimes(1)
    })

    it('returns null when no native window is available', () => {
      const hooks = createShellHooks(() => null, {
        openExternal: mock(() => undefined),
        openFileDialog: async () => []
      })
      expect(hooks.getWindowPosition?.()).toBeNull()
    })

    it('forwards setWindowPosition to the native window', () => {
      const win = makeWin()
      const hooks = createShellHooks(() => win, {
        openExternal: mock(() => undefined),
        openFileDialog: async () => []
      })
      hooks.setWindowPosition?.(300, 450)
      expect(win.setPosition).toHaveBeenCalledWith(300, 450)
    })

    it('silently no-ops setWindowPosition when the window is gone', () => {
      const hooks = createShellHooks(() => null, {
        openExternal: mock(() => undefined),
        openFileDialog: async () => []
      })
      expect(() => hooks.setWindowPosition?.(10, 20)).not.toThrow()
    })
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

  it('targets the packaged shell renderer with the chromeless translucent window', () => {
    const opts = buildBrowserWindowCreateOptions(frame, rpc, 'linux')
    expect(opts.url).toBe(MAIN_WINDOW_RENDERER_URL)
    expect(opts.frame).toEqual(frame)
    expect(opts.rpc).toBe(rpc)
    expect(opts.title).toBe('kb')
    // Transparency is requested unconditionally so the rounded `.theme-app-shell`
    // panel can float on the desktop without a hard window-bounds rectangle
    // around it; non-darwin compositors that don't support window transparency
    // will silently render an opaque background.
    expect(opts.transparent).toBe(true)
  })

  describe('by platform', () => {
    it('hides the native title bar on macOS for the chromeless look', () => {
      // `'hidden'` removes the title bar and the traffic-light buttons.
      // The window is undraggable in this mode — window drag is wired
      // separately through a JS-driven handler over RPC.
      expect(buildBrowserWindowCreateOptions(frame, rpc, 'darwin').titleBarStyle).toBe('hidden')
    })

    it('keeps the default native chrome elsewhere', () => {
      expect(buildBrowserWindowCreateOptions(frame, rpc, 'win32').titleBarStyle).toBe('default')
      expect(buildBrowserWindowCreateOptions(frame, rpc, 'linux').titleBarStyle).toBe('default')
    })
  })
})
