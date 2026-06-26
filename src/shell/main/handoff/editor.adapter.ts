import { getLogger } from '@shared/logging'
import { Utils } from 'electrobun/bun'

const log = getLogger(['kb', 'main', 'handoff', 'editor'])

const WHITESPACE_RE = /\s/

/** Split $EDITOR-style command string respecting single and double quotes. */
function splitShellCommand(cmd: string): string[] {
  const parts: string[] = []
  let current = ''
  let inQuote: string | null = null
  for (const ch of cmd) {
    if (inQuote) {
      if (ch === inQuote) {
        inQuote = null
      } else {
        current += ch
      }
      continue
    }
    if (ch === '"' || ch === "'") {
      inQuote = ch
      continue
    }
    if (WHITESPACE_RE.test(ch)) {
      if (current) {
        parts.push(current)
        current = ''
      }
      continue
    }
    current += ch
  }
  if (current) parts.push(current)
  return parts
}
export type EditorHandoffResult = { ok: true } | { ok: false; error: string }

function darwinOpenInEditor(filePath: string, editorApp: string): EditorHandoffResult {
  try {
    Bun.$`open -a ${editorApp} ${filePath}`.quiet().nothrow()
    return { ok: true }
  } catch (e) {
    log.debug('editor (darwin) failed', { error: String(e) })
    return { ok: false, error: String(e) }
  }
}

function linuxOpenInEditor(filePath: string, editorApp: string): EditorHandoffResult {
  try {
    const desktopId = editorApp.toLowerCase().replace(/\s+/g, '-')
    const result = Bun.spawnSync(['gtk-launch', desktopId, filePath])
    if (result.exitCode === 0) return { ok: true }
    log.debug('editor (linux) gtk-launch failed', { exitCode: result.exitCode, stderr: String(result.stderr) })
    return { ok: false, error: `gtk-launch failed for ${editorApp} (desktop-id: ${desktopId})` }
  } catch (e) {
    log.debug('editor (linux) exception', { error: String(e) })
    return { ok: false, error: String(e) }
  }
}

function spawnEditorFromEnv(filePath: string, editor: string): EditorHandoffResult {
  try {
    const parts = splitShellCommand(editor)
    if (parts.length === 0) {
      return { ok: false, error: 'EDITOR is empty' }
    }
    const cmd = parts[0]
    if (!cmd) {
      return { ok: false, error: 'EDITOR is empty' }
    }
    const extraArgs = parts.slice(1)
    const proc = Bun.spawn([cmd, ...extraArgs, filePath], { detached: true, stdio: ['ignore', 'ignore', 'ignore'] })
    proc.unref()
    return { ok: true }
  } catch (e) {
    log.debug('editor ($EDITOR) failed', { error: String(e) })
    return { ok: false, error: String(e) }
  }
}

export type PreferredEditorOptions = {
  editorApp?: string
  editorFromEnv?: string
}

/**
 * Open a file in the configured editor app, `$EDITOR`, or the system default.
 */
export function openInPreferredEditor(
  filePath: string,
  preferred: PreferredEditorOptions,
  platform: NodeJS.Platform = process.platform
): EditorHandoffResult {
  if (preferred.editorApp) {
    return openInEditor(filePath, preferred.editorApp, platform)
  }

  const fromEnv = preferred.editorFromEnv?.trim()
  if (fromEnv) {
    return spawnEditorFromEnv(filePath, fromEnv)
  }

  return openInEditor(filePath, undefined, platform)
}

export function openInEditor(
  filePath: string,
  editorApp?: string,
  platform: NodeJS.Platform = process.platform
): EditorHandoffResult {
  try {
    if (editorApp) {
      if (platform === 'darwin') return darwinOpenInEditor(filePath, editorApp)
      if (platform === 'linux') return linuxOpenInEditor(filePath, editorApp)
      return { ok: false, error: `Editor handoff not supported on ${platform}` }
    }

    const ok = Utils.openPath(filePath)
    if (!ok) {
      return { ok: false, error: 'openPath returned false' }
    }
    return { ok: true }
  } catch (e) {
    log.debug('editor handoff (default path) failed', { error: String(e) })
    return { ok: false, error: String(e) }
  }
}
