import { getLogger } from '@shared/logging'
import { Utils } from 'electrobun/bun'

const log = getLogger(['kb', 'main', 'handoff', 'editor'])

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
