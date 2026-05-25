import type { Display } from 'electrobun/bun'

import type { RpcSyncProgressPayload } from '../../shared/rpc'
import type { SyncEmitter } from '../app/app'
import type { AppShellHooks } from '../app/lib/app_shell_hooks.types'
import { isUsableWorkArea, resolveInitialFrame, type Size, type WindowFrame } from './window/placement.util'

export const MAIN_WINDOW_DEFAULT_SIZE = { width: 680, height: 420 } as const satisfies Size
export const MAIN_WINDOW_RENDERER_URL = 'views://shell/index.html' as const

export type MainWindowLike = {
  setSize: (width: number, height: number) => void
  minimize: () => void
}

export type KbShellHooksUtils = {
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
  log: { debug: (args: unknown[]) => void },
  size: Size = MAIN_WINDOW_DEFAULT_SIZE
): WindowFrame {
  if (!isUsableWorkArea(primary?.workArea)) {
    log.debug(['window placement: primary display work area unavailable; using safe fallback (100,100)'])
  }
  return resolveInitialFrame(primary ?? null, size)
}

/**
 * Forward sync events to the webview RPC once {@link getKbRpc} returns a transport.
 */
export function createKbLateEmit<Rpc>(
  getKbRpc: () => Rpc | null,
  mkSyncEmitter: (rpc: Rpc) => Required<SyncEmitter>
): Required<SyncEmitter> {
  return {
    syncProgress: (payload: RpcSyncProgressPayload) => {
      const rpc = getKbRpc()
      if (rpc) mkSyncEmitter(rpc).syncProgress(payload)
    },
    syncComplete: result => {
      const rpc = getKbRpc()
      if (rpc) mkSyncEmitter(rpc).syncComplete(result)
    }
  }
}

/**
 * Native shell hooks for window chrome, dialogs, and external URLs (inject Electrobun `Utils` from main).
 */
export function createKbShellHooks(getWin: () => MainWindowLike | null, utils: KbShellHooksUtils): AppShellHooks {
  return {
    resizeWindow: (width, height) => {
      getWin()?.setSize(width, height)
    },
    hideWindow: () => {
      getWin()?.minimize()
    },
    openExternal: url => {
      utils.openExternal(url)
    },
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
    pasteInTerminal: (_cmd, terminalApp) => {
      if (terminalApp) utils.openExternal(terminalApp)
    },
    openInEditor: (filePath, _editorApp) => {
      const fileUrl = filePath.startsWith('/') ? `file://${filePath}` : filePath
      utils.openExternal(fileUrl)
    }
  }
}

/**
 * {@link BrowserWindow} constructor options shared by main bootstrap (extracted for tests).
 */
export function buildBrowserWindowCreateOptions<Rpc>(frame: WindowFrame, rpc: Rpc, platform: NodeJS.Platform) {
  return {
    title: 'kb',
    url: MAIN_WINDOW_RENDERER_URL,
    frame,
    titleBarStyle: platform === 'darwin' ? ('hidden' as const) : ('default' as const),
    transparent: true,
    rpc
  }
}
