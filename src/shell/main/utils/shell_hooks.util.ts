import type { RpcSyncProgressPayload } from '@shared/rpc'
import type { Display } from 'electrobun/bun'
import type { SyncEmitter } from '../../app/app'
import type { AppShellHooks } from '../../app/lib/app_shell_hooks.types'
import { type HandoffServices, runEntryHandoff } from '../handoff/handoff_registry.service'
import { isUsableWorkArea, resolveInitialFrame, type Size, type WindowFrame } from '../window/placement.util'

export const MAIN_WINDOW_DEFAULT_SIZE = { width: 680, height: 600 } as const satisfies Size
export const MAIN_WINDOW_RENDERER_URL = 'views://shell/index.html' as const

export type MainWindowLike = {
  setSize: (width: number, height: number) => void
  minimize: () => void
  unminimize: () => void
  getPosition: () => { x: number; y: number }
  setPosition: (x: number, y: number) => void
}

export type ShellHooksUtils = {
  openExternal: (url: string) => void
  openFileDialog: (opts: {
    startingFolder?: string
    canChooseFiles: boolean
    canChooseDirectory: boolean
    allowsMultipleSelection: boolean
  }) => Promise<string[]>
}

/**
 * Initial window frame from the primary display, with debug logging when work area is missing.
 */
export function computeInitialFrameFromDisplay(
  primary: Display | null | undefined,
  log: { debug: (message: string) => void },
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
  handoffServices?: HandoffServices
): AppShellHooks {
  return {
    resizeWindow: (width, height) => {
      getWin()?.setSize(width, height)
    },
    hideWindow: () => {
      getWin()?.minimize()
    },
    getWindowPosition: () => getWin()?.getPosition() ?? null,
    setWindowPosition: (x, y) => {
      getWin()?.setPosition(x, y)
    },
    openExternal: url => openExternalWithFallback(url, utils, handoffServices),
    showOpenDialog: async opts => {
      const properties = opts?.properties ?? []
      const canChooseDirectory = properties.includes('openDirectory')
      const canChooseFiles = properties.length === 0 || properties.includes('openFile')
      const paths = await utils.openFileDialog({
        startingFolder: opts?.defaultPath,
        canChooseFiles,
        canChooseDirectory,
        allowsMultipleSelection: false
      })
      return paths[0] ?? null
    },
    pasteInTerminal: (cmd, terminalApp) =>
      terminalHandoffWithFallback('terminal-paste', cmd, terminalApp, utils, handoffServices),
    runInTerminal: (cmd, terminalApp) =>
      terminalHandoffWithFallback('terminal-run', cmd, terminalApp, utils, handoffServices),
    pasteDoc: doc => pasteDocWithFallback(doc, handoffServices),
    openInEditor: (filePath, editorApp) => openInEditorWithFallback(filePath, editorApp, utils, handoffServices)
  }
}

function openExternalWithFallback(url: string, utils: ShellHooksUtils, h?: HandoffServices): void {
  if (!h) {
    utils.openExternal(url)
    return
  }
  const result = runEntryHandoff('browser-open', { url }, h)
  if (!result.ok) throw new Error(`openExternal failed: ${result.error}`)
}

function terminalHandoffWithFallback(
  kind: 'terminal-paste' | 'terminal-run',
  cmd: string,
  terminalApp: string | undefined,
  utils: ShellHooksUtils,
  h?: HandoffServices
): void {
  if (!h) {
    if (terminalApp) utils.openExternal(terminalApp)
    return
  }
  const result = runEntryHandoff(kind, { cmd, terminalApp }, h)
  if (!result.ok) throw new Error(`${kind} failed: ${result.error}`)
}

function pasteDocWithFallback(doc: string, h?: HandoffServices): void {
  if (!h) return
  const result = runEntryHandoff('paste-frontmost', { doc }, h)
  if (!result.ok) throw new Error(`pasteDoc failed: ${result.error}`)
}

function openInEditorWithFallback(
  filePath: string,
  editorApp: string | undefined,
  utils: ShellHooksUtils,
  h?: HandoffServices
): void {
  if (!h) {
    const fileUrl = filePath.startsWith('/') ? `file://${filePath}` : filePath
    utils.openExternal(fileUrl)
    return
  }
  const result = runEntryHandoff('editor-open', { filePath, editorApp }, h)
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
    rpc
  }
}
