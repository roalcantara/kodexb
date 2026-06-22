import type { OpenDialogOpts } from '@shared/rpc'
import type { LoadedConfig } from '../../config/config.loader'
import type { AppShellHooks, WindowPosition } from './shell_hooks.types'

export function rejectShellNotImplemented(method: string): Promise<never> {
  return Promise.reject(new Error(`Not implemented: ${method}`))
}

export function openExternalUrl(hooks: AppShellHooks, url: string): Promise<void> {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch (err) {
    return Promise.reject(err)
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return Promise.reject(new Error(`Unsupported URL protocol: ${parsed.protocol}`))
  }
  return new Promise((resolve, reject) => {
    try {
      hooks.openExternal?.(parsed.toString())
      resolve()
    } catch (e) {
      reject(e instanceof Error ? e : new Error(String(e)))
    }
  })
}

export function pasteInTerminalFor(hooks: AppShellHooks, cmd: string, terminalApp?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      hooks.pasteInTerminal?.(cmd, terminalApp)
      resolve()
    } catch (e) {
      reject(e instanceof Error ? e : new Error(String(e)))
    }
  })
}

export function runInTerminalFor(hooks: AppShellHooks, cmd: string, terminalApp?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      hooks.runInTerminal?.(cmd, terminalApp)
      resolve()
    } catch (e) {
      reject(e instanceof Error ? e : new Error(String(e)))
    }
  })
}

export function pasteDocFor(hooks: AppShellHooks, doc: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      hooks.pasteDoc?.(doc)
      resolve()
    } catch (e) {
      reject(e instanceof Error ? e : new Error(String(e)))
    }
  })
}

export function openInEditorFor(hooks: AppShellHooks, filePath: string, editorApp?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      hooks.openInEditor?.(filePath, editorApp)
      resolve()
    } catch (e) {
      reject(e instanceof Error ? e : new Error(String(e)))
    }
  })
}

export function showOpenDialogFor(hooks: AppShellHooks, opts?: OpenDialogOpts): Promise<string | null> {
  const fn = hooks.showOpenDialog
  if (!fn) {
    return rejectShellNotImplemented('showOpenDialog')
  }
  return fn(opts)
}

export function resizeWindowFor(hooks: AppShellHooks, width: number, height: number): Promise<void> {
  const fn = hooks.resizeWindow
  if (!fn) {
    return rejectShellNotImplemented('resizeWindow')
  }
  fn(width, height)
  return Promise.resolve()
}

export function hideWindowFor(hooks: AppShellHooks): Promise<void> {
  hooks.hideWindow?.()
  return Promise.resolve()
}

/**
 * Returns the window position or `null` when no native window is bound (preview
 * server, tests). Renderer treats `null` as "drag unsupported" and disables
 * the drag stripe instead of throwing.
 */
export function getWindowPositionFor(hooks: AppShellHooks): Promise<WindowPosition | null> {
  const fn = hooks.getWindowPosition
  if (!fn) return Promise.resolve(null)
  return Promise.resolve(fn())
}

export function setWindowPositionFor(hooks: AppShellHooks, x: number, y: number): Promise<void> {
  hooks.setWindowPosition?.(x, y)
  return Promise.resolve()
}

export function quitFor(hooks: AppShellHooks): Promise<void> {
  hooks.quit?.()
  return Promise.resolve()
}

/** Bundled shell RPC delegates to keep {@link App} under file-length lint. */
export function createAppShellDelegates(hooks: AppShellHooks, getLoaded: () => LoadedConfig) {
  return {
    openExternal: (url: string) => openExternalUrl(hooks, url),
    pasteInTerminal: (cmd: string) => pasteInTerminalFor(hooks, cmd, getLoaded().display.terminalApp),
    runInTerminal: (cmd: string) => runInTerminalFor(hooks, cmd, getLoaded().display.terminalApp),
    pasteDoc: (doc: string) => pasteDocFor(hooks, doc),
    openInEditor: (filePath: string) => openInEditorFor(hooks, filePath, getLoaded().display.editorApp),
    showOpenDialog: (opts?: OpenDialogOpts) => showOpenDialogFor(hooks, opts),
    resizeWindow: (width: number, height: number) => resizeWindowFor(hooks, width, height),
    hideWindow: () => hideWindowFor(hooks),
    getWindowPosition: () => getWindowPositionFor(hooks),
    setWindowPosition: (x: number, y: number) => setWindowPositionFor(hooks, x, y),
    quit: () => quitFor(hooks)
  }
}
