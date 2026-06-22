import { afterEach, beforeAll, describe, expect, it, mock } from 'bun:test'

import { factoryFor } from '@testing'
import { SAFE_FALLBACK_X, SAFE_FALLBACK_Y, computeInitialFrameFromDisplay } from '../window/placement.util'
import { buildBrowserWindowCreateOptions, MAIN_WINDOW_DEFAULT_SIZE, MAIN_WINDOW_RENDERER_URL } from '../window/window.const'
import { createDeferredSyncEmit } from '../../../shell/app/lib/sync/deferred_emit.service'
import type { RunEntryHandoff } from '../window/window.types'
import { createShellHooks } from '../window/shell_hooks.service'

const mockRunEntryHandoffCalls: unknown[][] = []

/** Injected via `createShellHooks` — never `mock.module` the registry (parallel CI leak). */
function makeStubRunHandoff(): RunEntryHandoff {
  return (kind, payload, services) => {
    mockRunEntryHandoffCalls.push([kind, payload, services])
    if (kind === 'browser-open' && !payload.url) {
      return { ok: false, error: 'No URL provided', code: 'browser-open-failed' }
    }
    if (kind === 'editor-open' && !payload.filePath) {
      return { ok: false, error: 'No file path provided', code: 'editor-open-failed' }
    }
    return { ok: true }
  }
}

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
  describe('when the webview RPC is not ready', () => {
    it('returns no-ops', () => {
      const mkSyncEmitter = mock((_rpc: unknown) => ({
        syncProgress: mock(() => undefined),
        syncComplete: mock(() => undefined)
      }))
      const emit = createDeferredSyncEmit(() => null, mkSyncEmitter)
      emit.syncProgress({ processed: 1, total: 2 })
      expect(mkSyncEmitter).not.toHaveBeenCalled()
    })
  })

  it('forwards sync events through the sync emitter', () => {
    const syncProgress = mock((_payload: unknown) => undefined)
    const syncComplete = mock((_result: unknown) => undefined)
    const rpc = { id: 'rpc-1' }
    const mkSyncEmitter = mock(() => ({ syncProgress, syncComplete }))
    const emit = createDeferredSyncEmit(() => rpc, mkSyncEmitter)
    const payload = { processed: 2, total: 5 }
    const result = {
      filesProcessed: 5,
      inserted: 1,
      updated: 0,
      errors: [] as string[],
      warnings: [] as string[],
      fileLog: []
    }
    emit.syncProgress(payload)
    emit.syncComplete(result)
    expect(mkSyncEmitter).toHaveBeenCalledWith(rpc)
    expect(syncProgress).toHaveBeenCalledWith(payload)
    expect(syncComplete).toHaveBeenCalledWith(result)
  })
})

describe('createShellHooks', () => {
  let createShellHooks: typeof import('../window/shell_hooks.service').createShellHooks

  beforeAll(async () => {
    ;({ createShellHooks } = await import('../window/shell_hooks.service'))
  })

  function makeWin(position = { x: 0, y: 0 }) {
    return {
      setSize: mock((_w: number, _h: number) => undefined),
      minimize: mock(() => undefined),
      unminimize: mock(() => undefined),
      getPosition: mock(() => position),
      setPosition: mock((_x: number, _y: number) => undefined)
    }
  }

  function makeHandoffServices() {
    return {
      hide: mock(() => undefined),
      show: mock(() => undefined),
      armGuard: mock(() => undefined),
      disarmGuard: mock(() => undefined)
    }
  }

  function makeUtils() {
    return {
      openExternal: mock((_url: string) => true),
      openPath: mock((_path: string) => true),
      openFileDialog: async () => []
    }
  }

  afterEach(() => {
    mock.restore()
    mockRunEntryHandoffCalls.length = 0
  })

  describe('when window is present', () => {
    it('resizes and minimizes the window', () => {
      const win = makeWin()
      const hooks = createShellHooks(() => win, makeUtils())
      hooks.resizeWindow?.(800, 600)
      hooks.hideWindow?.()
      expect(win.setSize).toHaveBeenCalledWith(800, 600)
      expect(win.minimize).toHaveBeenCalledTimes(1)
    })
  })

  describe('window position hooks', () => {
    describe('when the window is present', () => {
      it('reads the native window position', () => {
        const win = makeWin({ x: 120, y: 240 })
        const hooks = createShellHooks(() => win, makeUtils())
        expect(hooks.getWindowPosition?.()).toEqual({ x: 120, y: 240 })
        expect(win.getPosition).toHaveBeenCalledTimes(1)
      })

      it('forwards setWindowPosition to the native window', () => {
        const win = makeWin()
        const hooks = createShellHooks(() => win, makeUtils())
        hooks.setWindowPosition?.(300, 450)
        expect(win.setPosition).toHaveBeenCalledWith(300, 450)
      })
    })

    describe('when no native window is available', () => {
      it('returns null', () => {
        const hooks = createShellHooks(() => null, makeUtils())
        expect(hooks.getWindowPosition?.()).toBeNull()
      })
    })

    describe('when the window is gone', () => {
      it('silently no-ops setWindowPosition', () => {
        const hooks = createShellHooks(() => null, makeUtils())
        expect(() => hooks.setWindowPosition?.(10, 20)).not.toThrow()
      })
    })
  })

  it('maps showOpenDialog to Utils.openFileDialog shape', async () => {
    const openFileDialog = mock(async () => ['/picked/file.md'])
    const hooks = createShellHooks(() => null, { ...makeUtils(), openFileDialog })
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

  it('opens absolute file paths via openPath', () => {
    const utils = makeUtils()
    const hooks = createShellHooks(() => null, utils)
    hooks.openInEditor?.('/tmp/note.md')
    expect(utils.openPath).toHaveBeenCalledWith('/tmp/note.md')
  })

  describe('handoff failure propagation', () => {
    function makeHandoffHooks() {
      return createShellHooks(() => null, makeUtils(), makeHandoffServices())
    }

    it('throws when openExternal receives an empty URL', () => {
      expect(() => makeHandoffHooks().openExternal?.('')).toThrow('openExternal failed')
    })

    it('throws when openInEditor receives an empty path', () => {
      expect(() => makeHandoffHooks().openInEditor?.('', 'Code')).toThrow('openInEditor failed')
    })

    it('falls back to openExternal when handoffServices is not provided', () => {
      const utils = makeUtils()
      const hooks = createShellHooks(() => null, utils)
      hooks.openExternal?.('https://example.com')
      expect(utils.openExternal).toHaveBeenCalledWith('https://example.com')
    })

    it('falls back to openExternal for pasteInTerminal when handoffServices is not provided', () => {
      const utils = makeUtils()
      const hooks = createShellHooks(() => null, utils)
      hooks.pasteInTerminal?.('echo hi', 'Terminal')
      expect(utils.openExternal).toHaveBeenCalledWith('Terminal')
    })

    it('falls back to openExternal for runInTerminal when handoffServices is not provided', () => {
      const utils = makeUtils()
      const hooks = createShellHooks(() => null, utils)
      hooks.runInTerminal?.('ls -la', 'iTerm2')
      expect(utils.openExternal).toHaveBeenCalledWith('iTerm2')
    })

    it('silently no-ops pasteDoc when handoffServices is not provided', () => {
      const hooks = createShellHooks(() => null, makeUtils())
      expect(() => hooks.pasteDoc?.('docs-content')).not.toThrow()
    })

    it('no-ops pasteInTerminal without terminalApp when handoffServices is not provided', () => {
      const utils = makeUtils()
      const hooks = createShellHooks(() => null, utils)
      expect(() => hooks.pasteInTerminal?.('echo hi')).not.toThrow()
      expect(utils.openExternal).not.toHaveBeenCalled()
    })
  })

  describe('fallback error propagation', () => {
    function makeFailingUtils() {
      return {
        openExternal: mock((_url: string) => false),
        openPath: mock((_path: string) => false),
        openFileDialog: async () => []
      }
    }

    it('throws when openExternal fallback returns false', () => {
      const hooks = createShellHooks(() => null, makeFailingUtils())
      expect(() => hooks.openExternal?.('https://example.com')).toThrow('openExternal failed for URL')
    })

    it('throws when openInEditor fallback returns false', () => {
      const hooks = createShellHooks(() => null, makeFailingUtils())
      expect(() => hooks.openInEditor?.('/tmp/note.md')).toThrow('openInEditor failed for path')
    })

    it('throws when editorApp provided without handoffServices', () => {
      const hooks = createShellHooks(() => null, makeUtils())
      expect(() => hooks.openInEditor?.('/tmp/note.md', 'Code')).toThrow('editorApp provided without handoffServices')
    })

    it('throws when pasteInTerminal fallback returns false', () => {
      const hooks = createShellHooks(() => null, makeFailingUtils())
      expect(() => hooks.pasteInTerminal?.('echo hi', 'Terminal')).toThrow('terminal-paste failed for terminal')
    })
  })

  describe('runInTerminal and pasteDoc delegation', () => {
    it('runInTerminal delegates to runEntryHandoff with terminal-run kind', () => {
      const hooks = createShellHooks(() => null, makeUtils(), makeHandoffServices(), makeStubRunHandoff())
      hooks.runInTerminal?.('npm test', 'Terminal')

      const call = mockRunEntryHandoffCalls.find(c => c[0] === 'terminal-run')
      expect(call).toBeDefined()
      expect(call?.[1]).toMatchObject({ cmd: 'npm test', terminalApp: 'Terminal' })
    })

    it('pasteDoc delegates to runEntryHandoff with paste-frontmost kind', () => {
      const hooks = createShellHooks(() => null, makeUtils(), makeHandoffServices(), makeStubRunHandoff())
      hooks.pasteDoc?.('docs-content')

      const call = mockRunEntryHandoffCalls.find(c => c[0] === 'paste-frontmost')
      expect(call).toBeDefined()
      expect(call?.[1]).toMatchObject({ doc: 'docs-content' })
    })
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

  describe('when platform is darwin', () => {
    it('hides the native title bar for the chromeless look', () => {
      // `'hidden'` removes the title bar and the traffic-light buttons.
      // The window is undraggable in this mode — window drag is wired
      // separately through a JS-driven handler over RPC.
      expect(buildBrowserWindowCreateOptions(frame, rpc, 'darwin').titleBarStyle).toBe('hidden')
    })

    it('starts hidden as a background launcher agent until summon or dock focus', () => {
      const opts = buildBrowserWindowCreateOptions(frame, rpc, 'darwin')
      expect(opts.hidden).toBe(true)
      expect(opts.activate).toBe(false)
    })
  })
  describe('when platform is linux', () => {
    it('keeps the default native chrome elsewhere', () => {
      expect(buildBrowserWindowCreateOptions(frame, rpc, 'win32').titleBarStyle).toBe('default')
      expect(buildBrowserWindowCreateOptions(frame, rpc, 'linux').titleBarStyle).toBe('default')
    })
  })
})
