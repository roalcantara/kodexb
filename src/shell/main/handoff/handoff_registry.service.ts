import { type BrowserHandoffResult, openInBrowser } from './browser_handoff.util'
import { type EditorHandoffResult, openInEditor as openInEditorUtil } from './editor_handoff.util'
import { readSystemClipboard, writeSystemClipboard } from './electrobun_clipboard.port'
import { type PasteFrontmostResult, pasteIntoFrontmostApp } from './paste_frontmost_handoff.util'
import { resolveTerminalAppName } from './resolve_terminal_app_name.util'
import { pasteInTerminal, runInTerminal, type TerminalHandoffResult } from './terminal_handoff.util'

export type HandoffKind = 'browser-open' | 'terminal-paste' | 'terminal-run' | 'paste-frontmost' | 'editor-open'

export type HandoffResult = { ok: true } | { ok: false; error: string; code: string }

export type HandoffServices = {
  armGuard: () => void
  disarmGuard: () => void
  hide: () => void
  show: () => void
}

export function runEntryHandoff(
  kind: HandoffKind,
  payload: { url?: string; cmd?: string; doc?: string; filePath?: string; terminalApp?: string; editorApp?: string },
  services: HandoffServices,
  platform: NodeJS.Platform = process.platform
): HandoffResult {
  try {
    services.armGuard()

    let previousClipboard = ''
    let needsClipboardRestore = false

    if ((kind === 'terminal-paste' || kind === 'terminal-run') && payload.cmd) {
      previousClipboard = readSystemClipboard()
      writeSystemClipboard(payload.cmd)
      needsClipboardRestore = true
    }
    if (kind === 'paste-frontmost' && payload.doc) {
      previousClipboard = readSystemClipboard()
      writeSystemClipboard(payload.doc)
      needsClipboardRestore = true
    }

    services.hide()

    const result = dispatchHandoff(kind, payload, platform)

    if (result.ok) {
      if (needsClipboardRestore) {
        writeSystemClipboard(previousClipboard)
      }
      services.disarmGuard()
      return { ok: true }
    }

    if (needsClipboardRestore) {
      writeSystemClipboard(previousClipboard)
    }
    services.show()
    services.disarmGuard()
    return { ok: false, error: result.error, code: kindToErrorCode(kind) }
  } catch (e) {
    services.show()
    services.disarmGuard()
    return { ok: false, error: String(e), code: kindToErrorCode(kind) }
  }
}

function dispatchHandoff(
  kind: HandoffKind,
  payload: { url?: string; cmd?: string; doc?: string; filePath?: string; terminalApp?: string; editorApp?: string },
  platform: NodeJS.Platform
): BrowserHandoffResult | TerminalHandoffResult | PasteFrontmostResult | EditorHandoffResult {
  if (kind === 'browser-open') {
    if (!payload.url) return { ok: false, error: 'No URL provided' }
    return openInBrowser(payload.url, platform)
  }
  if (kind === 'terminal-paste') {
    return pasteInTerminal(resolveTerminalAppName(payload.terminalApp, platform), platform)
  }
  if (kind === 'terminal-run') {
    return runInTerminal(resolveTerminalAppName(payload.terminalApp, platform), platform)
  }
  if (kind === 'paste-frontmost') {
    return pasteIntoFrontmostApp(platform)
  }
  if (!payload.filePath) return { ok: false, error: 'No file path provided' }
  return openInEditorUtil(payload.filePath, payload.editorApp, platform)
}

const HANDOFF_ERROR_CODES: Record<HandoffKind, string> = {
  'browser-open': 'browser-open-failed',
  'terminal-paste': 'terminal-paste-failed',
  'terminal-run': 'terminal-run-failed',
  'paste-frontmost': 'paste-doc-failed',
  'editor-open': 'editor-open-failed'
}

function kindToErrorCode(kind: HandoffKind): string {
  return HANDOFF_ERROR_CODES[kind]
}
