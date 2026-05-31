import { getLogger } from '@shared/logging'

const log = getLogger(['kb', 'main', 'handoff', 'resolve-frontmost-app'])

const FRONTMOST_APP_SCRIPT = `tell application "System Events"
  set frontApp to first application process whose frontmost is true
  return bundle identifier of frontApp
end tell`

export function resolveFrontmostAppBundleId(platform?: NodeJS.Platform): string | null {
  const p = platform ?? process.platform
  if (p !== 'darwin') {
    log.debug('frontmost-app: skipped (os={os})', { os: String(p) })
    return null
  }
  try {
    const result = Bun.spawnSync(['osascript', '-e', FRONTMOST_APP_SCRIPT])
    const stdout = result.stdout?.toString().trim()
    if (!stdout) {
      log.debug('resolveFrontmostAppBundleId: osascript returned empty stdout')
    }
    return stdout || null
  } catch (e) {
    log.debug('resolveFrontmostAppBundleId: osascript/spawn failed', { error: String(e) })
    return null
  }
}
