import type { AppShellHooks } from '../../app/lib/app_shell_hooks.types'
import {
  runEntryHandoff as defaultRunEntryHandoff,
  type HandoffServices
} from '../handoff/registry.service'
import { adaptPositionForNativeWindow, adaptPositionFromNativeWindow } from './darwin_window_frame.util'
import type { MainWindowLike, RunEntryHandoff, ShellHooksUtils, WindowPositionAdapter } from './window.types'

export function createShellHooks(
  getWin: () => MainWindowLike | null,
  utils: ShellHooksUtils,
  handoffServices?: HandoffServices,
  runHandoff: RunEntryHandoff = defaultRunEntryHandoff,
  positionAdapter?: WindowPositionAdapter
): AppShellHooks {
  return {
    resizeWindow: (width: number, height: number) => {
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
    setWindowPosition: (x: number, y: number) => {
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
    openExternal: (url: string) => openExternalWithFallback(url, utils, handoffServices, runHandoff),
    showOpenDialog: async (opts: { defaultPath?: string; properties?: string[] } | undefined) => {
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
    pasteInTerminal: (cmd: string, terminalApp: string | undefined) =>
      terminalHandoffWithFallback('terminal-paste', cmd, terminalApp, utils, handoffServices, runHandoff),
    runInTerminal: (cmd: string, terminalApp: string | undefined) =>
      terminalHandoffWithFallback('terminal-run', cmd, terminalApp, utils, handoffServices, runHandoff),
    pasteDoc: (doc: string) => pasteDocWithFallback(doc, handoffServices, runHandoff),
    openInEditor: (filePath: string, editorApp: string | undefined) =>
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
