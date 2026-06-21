import type { RpcSyncProgressPayload } from '@shared/rpc'
import type { Display } from 'electrobun/bun'
import type { SyncEmitter } from '../../app/app'
import type { AppShellHooks } from '../../app/lib/app_shell_hooks.types'
import {
  runEntryHandoff as defaultRunEntryHandoff,
  type HandoffResult,
  type HandoffServices
} from '../handoff/registry.service'
import { adaptPositionForNativeWindow, adaptPositionFromNativeWindow } from '../window/darwin_window_frame.util'
import { isUsableWorkArea, resolveInitialFrame, type Size, type WindowFrame } from '../window/placement.util'

export type RunEntryHandoff = (
  kind: Parameters<typeof defaultRunEntryHandoff>[0],
  payload: Parameters<typeof defaultRunEntryHandoff>[1],
  services: HandoffServices
) => HandoffResult

export const MAIN_WINDOW_DEFAULT_SIZE = { width: 748, height: 600 } as const satisfies Size
export const MAIN_WINDOW_RENDERER_URL = 'views://shell/index.html' as const

export type MainWindowLike = {
  setSize: (width: number, height: number) => void
  minimize: () => void
  unminimize: () => void
  getPosition: () => { x: number; y: number }
  setPosition: (x: number, y: number) => void
}

export type ShellHooksUtils = {
  openExternal: (url: string) => boolean
  openPath: (path: string) => boolean
  openFileDialog: (opts: {
    startingFolder?: string
    canChooseFiles: boolean
    canChooseDirectory: boolean
    allowsMultipleSelection: boolean
  }) => Promise<string[]>
}

export type WindowPositionAdapter = {
  platform: NodeJS.Platform
  windowHeight: number
  getDisplay: () => Display
  getPrimaryDisplay: () => Display
}

/**
 * Initial window frame from the primary display, with debug logging when work area is missing.
 */
export function computeInitialFrameFromDisplay(
  primary: Display | null | undefined,
  log: { debug: (message: string, properties?: Record<string, unknown>) => void },
  size: Size = MAIN_WINDOW_DEFAULT_SIZE
): WindowFrame {
  if (!isUsableWorkArea(primary?.workArea)) {
    log.debug('window placement: primary display work area unavailable; using safe fallback (100,100)')
  }
  return resolveInitialFrame(primary ?? null, size)
}

/**
 * Forward sync events to the webview RPC once {@link getWebviewRpc} returns a transport.
 */
export function createDeferredSyncEmit<Rpc>(
  getWebviewRpc: () => Rpc | null,
  mkSyncEmitter: (rpc: Rpc) => Required<SyncEmitter>
): Required<SyncEmitter> {
  return {
    syncProgress: (payload: RpcSyncProgressPayload) => {
      const rpc = getWebviewRpc()
      if (rpc) mkSyncEmitter(rpc).syncProgress(payload)
    },
    syncComplete: result => {
      const rpc = getWebviewRpc()
      if (rpc) mkSyncEmitter(rpc).syncComplete(result)
    }
  }
}

/**
 * Native shell hooks for window chrome, dialogs, and external URLs (inject Electrobun `Utils` from main).
 */
export function createShellHooks(
  getWin: () => MainWindowLike | null,
  utils: ShellHooksUtils,
  handoffServices?: HandoffServices,
  runHandoff: RunEntryHandoff = defaultRunEntryHandoff,
  positionAdapter?: WindowPositionAdapter
): AppShellHooks {
  return {
    resizeWindow: (width, height) => {
      getWin()?.setSize(width, height)
    },
    hideWindow: () => {
      getWin()?.minimize()
    },
    getWindowPosition: () => {
      const win = getWin()
      if (!win) return null
      const native = win.getPosition()
      if (!positionAdapter) return native
      return adaptPositionFromNativeWindow(
        native,
        positionAdapter.platform,
        positionAdapter.getDisplay(),
        positionAdapter.getPrimaryDisplay(),
        positionAdapter.windowHeight
      )
    },
    setWindowPosition: (x, y) => {
      const win = getWin()
      if (!win) return
      if (!positionAdapter) {
        win.setPosition(x, y)
        return
      }
      const native = adaptPositionForNativeWindow(
        { x, y },
        positionAdapter.platform,
        positionAdapter.getDisplay(),
        positionAdapter.getPrimaryDisplay(),
        positionAdapter.windowHeight
      )
      win.setPosition(native.x, native.y)
    },
    openExternal: url => openExternalWithFallback(url, utils, handoffServices, runHandoff),
    showOpenDialog: async (opts = {}) => {
      const properties = opts.properties ?? []
      const canChooseDirectory = properties.includes('openDirectory')
      const canChooseFiles = properties.length === 0 || properties.includes('openFile')
      const paths = await utils.openFileDialog({
        startingFolder: opts.defaultPath,
        canChooseFiles,
        canChooseDirectory,
        allowsMultipleSelection: false
      })
      return paths[0] ?? null
    },
    pasteInTerminal: (cmd, terminalApp) =>
      terminalHandoffWithFallback('terminal-paste', cmd, terminalApp, utils, handoffServices, runHandoff),
    runInTerminal: (cmd, terminalApp) =>
      terminalHandoffWithFallback('terminal-run', cmd, terminalApp, utils, handoffServices, runHandoff),
    pasteDoc: doc => pasteDocWithFallback(doc, handoffServices, runHandoff),
    openInEditor: (filePath, editorApp) =>
      openInEditorWithFallback(filePath, editorApp, utils, handoffServices, runHandoff)
  }
}

function openExternalWithFallback(
  url: string,
  utils: ShellHooksUtils,
  h: HandoffServices | undefined,
  runHandoff: RunEntryHandoff
): void {
  if (!h) {
    if (!utils.openExternal(url)) throw new Error(`openExternal failed for URL: ${url}`)
    return
  }
  const result = runHandoff('browser-open', { url }, h)
  if (!result.ok) throw new Error(`openExternal failed: ${result.error}`)
}

function terminalHandoffWithFallback(
  kind: 'terminal-paste' | 'terminal-run',
  cmd: string,
  terminalApp: string | undefined,
  utils: ShellHooksUtils,
  h: HandoffServices | undefined,
  runHandoff: RunEntryHandoff
): void {
  if (!h) {
    if (terminalApp && !utils.openExternal(terminalApp)) throw new Error(`${kind} failed for terminal: ${terminalApp}`)
    return
  }
  const result = runHandoff(kind, { cmd, terminalApp }, h)
  if (!result.ok) throw new Error(`${kind} failed: ${result.error}`)
}

function pasteDocWithFallback(doc: string, h: HandoffServices | undefined, runHandoff: RunEntryHandoff): void {
  if (!h) return
  const result = runHandoff('paste-frontmost', { doc }, h)
  if (!result.ok) throw new Error(`pasteDoc failed: ${result.error}`)
}

function openInEditorWithFallback(
  filePath: string,
  editorApp: string | undefined,
  utils: ShellHooksUtils,
  h: HandoffServices | undefined,
  runHandoff: RunEntryHandoff
): void {
  if (!h) {
    if (editorApp) throw new Error('openInEditor failed: editorApp provided without handoffServices')
    if (!utils.openPath(filePath)) throw new Error(`openInEditor failed for path: ${filePath}`)
    return
  }
  const result = runHandoff('editor-open', { filePath, editorApp }, h)
  if (!result.ok) throw new Error(`openInEditor failed: ${result.error}`)
}

/**
 * {@link BrowserWindow} constructor options shared by main bootstrap (extracted for tests).
 *
 * The window is **chromeless and translucent** so the renderer can paint a
 * single rounded floating panel (`.theme-app-shell`) using the
 * `Vivid Gothic Command` palette and let the desktop show through the
 * outer padding around the panel. See `:root` tokens in
 * `src/shell/renderer/styles/list.css` and the design system in `DESIGN.md`.
 *
 * On darwin:
 * - `titleBarStyle: 'hidden'` removes the native title bar and the traffic
 *   light buttons, giving the panel a fully custom chrome look.
 *
 * On other platforms we keep the default native chrome.
 *
 * Drag: WKWebView does not honor `-webkit-app-region: drag` and Electrobun
 * does not expose `setMovableByWindowBackground`, so window drag is driven
 * from the renderer via the `useWindowDrag` hook and the
 * `getWindowPosition` / `setWindowPosition` RPC routes.
 */
export function buildBrowserWindowCreateOptions<Rpc>(frame: WindowFrame, rpc: Rpc, platform: NodeJS.Platform) {
  const isDarwin = platform === 'darwin'
  return {
    title: 'kb',
    url: MAIN_WINDOW_RENDERER_URL,
    frame,
    titleBarStyle: (isDarwin ? 'hidden' : 'default') as 'hidden' | 'default',
    transparent: true,
    // Launcher agent: start tucked away on macOS until summon (Raycast, dock, or hotkey).
    hidden: isDarwin,
    activate: !isDarwin,
    rpc
  }
}
