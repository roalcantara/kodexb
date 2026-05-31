import { getLogger } from '@shared/logging'
import { xdotoolAvailable } from './xdotool_available.util'

const log = getLogger(['kb', 'main', 'handoff', 'terminal'])

export type TerminalHandoffResult = { ok: true } | { ok: false; error: string }

function pasteScript(appName: string): string {
  return `
    tell application "${appName}"
      activate
    end tell
    delay 0.5
    tell application "System Events"
      keystroke "v" using {command down}
    end tell`
}

function pasteAndRunScript(appName: string): string {
  return `
    tell application "${appName}"
      activate
    end tell
    delay 0.5
    tell application "System Events"
      keystroke "v" using {command down}
      keystroke return
    end tell`
}

function darwinPasteInTerminal(appName: string): TerminalHandoffResult {
  try {
    Bun.$`osascript -e ${pasteScript(appName)}`.quiet().nothrow()
    return { ok: true }
  } catch (e) {
    log.debug('terminal paste (darwin) failed', { error: String(e) })
    return { ok: false, error: String(e) }
  }
}

function darwinRunInTerminal(appName: string): TerminalHandoffResult {
  try {
    Bun.$`osascript -e ${pasteAndRunScript(appName)}`.quiet().nothrow()
    return { ok: true }
  } catch (e) {
    log.debug('terminal run (darwin) failed', { error: String(e) })
    return { ok: false, error: String(e) }
  }
}

function linuxPasteInTerminal(appName: string): TerminalHandoffResult {
  if (!xdotoolAvailable())
    return { ok: false, error: 'xdotool not found: install xdotool to enable Linux terminal handoff' }
  try {
    const activate = Bun.spawnSync(['xdotool', 'search', '--name', appName, 'windowactivate'])
    if (activate.exitCode !== 0) {
      const hint = `xdotool windowactivate failed (exit ${activate.exitCode})`
      log.debug('terminal paste (linux) activation failed', {
        exitCode: activate.exitCode,
        stderr: String(activate.stderr)
      })
      return { ok: false, error: hint }
    }
    Bun.spawnSync(['sleep', '0.2'])
    Bun.$`xdotool key ctrl+v`.quiet().nothrow()
    return { ok: true }
  } catch (e) {
    log.debug('terminal paste (linux) failed', { error: String(e) })
    return { ok: false, error: `xdotool error: ${String(e)}` }
  }
}

function linuxRunInTerminal(appName: string): TerminalHandoffResult {
  const pasteOk = linuxPasteInTerminal(appName)
  if (!pasteOk.ok) return pasteOk
  try {
    Bun.$`xdotool key Return`.quiet().nothrow()
    return { ok: true }
  } catch (e) {
    log.debug('terminal run (linux) key return failed', { error: String(e) })
    return { ok: false, error: String(e) }
  }
}

export function pasteInTerminal(appName: string, platform?: NodeJS.Platform): TerminalHandoffResult {
  const p = platform ?? process.platform
  if (p === 'darwin') return darwinPasteInTerminal(appName)
  if (p === 'linux') return linuxPasteInTerminal(appName)
  return { ok: false, error: 'Terminal handoff requires macOS or Linux' }
}

export function runInTerminal(appName: string, platform?: NodeJS.Platform): TerminalHandoffResult {
  const os = platform ?? process.platform
  if (os === 'darwin') {
    return darwinRunInTerminal(appName)
  }
  if (os === 'linux') {
    return linuxRunInTerminal(appName)
  }
  return { ok: false, error: 'Terminal handoff requires macOS or Linux' }
}
