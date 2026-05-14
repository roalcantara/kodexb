import type { OpenDialogOpts } from '../../../shared/rpc'

/** Optional native hooks (mutate after `BrowserWindow` construction). */
export type AppShellHooks = {
  resizeWindow?: (width: number, height: number) => void
  hideWindow?: () => void
  /** Terminate the desktop process (Electrobun `Utils.quit`). Omitted in preview / tests = no-op. */
  quit?: () => void
  openExternal?: (url: string) => void
  showOpenDialog?: (opts?: OpenDialogOpts) => Promise<string | null>
  pasteInTerminal?: (cmd: string, terminalApp?: string) => void
  openInEditor?: (filePath: string, editorApp?: string) => void
}
