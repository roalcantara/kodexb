import type { OpenDialogOpts } from '../../../shared/rpc'
import type { AppShellHooks } from './app_shell_hooks.types'

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
  hooks.openExternal?.(parsed.toString())
  return Promise.resolve()
}

export function pasteInTerminalFor(hooks: AppShellHooks, cmd: string, terminalApp?: string): Promise<void> {
  hooks.pasteInTerminal?.(cmd, terminalApp)
  return Promise.resolve()
}

export function openInEditorFor(hooks: AppShellHooks, filePath: string, editorApp?: string): Promise<void> {
  hooks.openInEditor?.(filePath, editorApp)
  return Promise.resolve()
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

export function quitFor(hooks: AppShellHooks): Promise<void> {
  hooks.quit?.()
  return Promise.resolve()
}
