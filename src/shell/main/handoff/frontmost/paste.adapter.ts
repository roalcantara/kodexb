import { getLogger } from '@shared/logging'
import { xdotoolAvailable } from '../xdotool.adapter'

const log = getLogger(['kb', 'main', 'handoff', 'paste-frontmost'])

export type PasteFrontmostResult = { ok: true } | { ok: false; error: string }

const PASTE_FRONTMOST_SCRIPT = `
  tell application "System Events"
    keystroke "v" using {command down}
  end tell`

function darwinPaste(): PasteFrontmostResult {
  try {
    Bun.$`osascript -e ${PASTE_FRONTMOST_SCRIPT}`.quiet().nothrow()
    return { ok: true }
  } catch (e) {
    log.debug('paste frontmost (darwin) failed', { error: String(e) })
    return { ok: false, error: String(e) }
  }
}

function linuxPaste(): PasteFrontmostResult {
  if (!xdotoolAvailable()) return { ok: false, error: 'xdotool not found: install xdotool to enable Linux paste' }
  const result = Bun.spawnSync(['xdotool', 'key', 'ctrl+v'])
  if (result.exitCode !== 0) {
    log.debug('paste frontmost (linux) failed', { exitCode: result.exitCode, stderr: String(result.stderr) })
    const detail = String(result.stderr).trim() || `exit ${result.exitCode}`
    return { ok: false, error: `xdotool key failed (${detail})` }
  }
  return { ok: true }
}

export function pasteIntoFrontmostApp(platform?: NodeJS.Platform): PasteFrontmostResult {
  const p = platform ?? process.platform
  if (p === 'darwin') return darwinPaste()
  if (p === 'linux') return linuxPaste()
  return { ok: false, error: 'Paste frontmost requires macOS or Linux' }
}
