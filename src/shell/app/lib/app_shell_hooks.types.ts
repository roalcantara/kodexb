import type { OpenDialogOpts } from '@shared/rpc'

/** Screen-coordinate window position (top-left). */
export type WindowPosition = { x: number; y: number }

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
  /**
   * Current top-left of the window in screen coordinates, or `null` when no
   * native window is wired (preview server, tests). Used by the renderer to
   * anchor a JS-driven window drag without round-tripping per-mousemove
   * setPosition calls against an unknown origin.
   */
  getWindowPosition?: () => WindowPosition | null
  /** Reposition the window to absolute screen coordinates. */
  setWindowPosition?: (x: number, y: number) => void
}
