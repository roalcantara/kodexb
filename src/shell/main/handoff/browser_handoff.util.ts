import { KNOWN_BROWSER_BUNDLE_IDS } from '@core/handoff/known_browsers.const'
import { Utils } from 'electrobun/bun'
import { resolveFrontmostAppBundleId } from './resolve_frontmost_app.util'

export type BrowserHandoffResult = { ok: true } | { ok: false; error: string }

export function openInBrowser(url: string): BrowserHandoffResult {
  try {
    const bundleId = resolveFrontmostAppBundleId()
    const knownBundleId = bundleId && KNOWN_BROWSER_BUNDLE_IDS.has(bundleId) ? bundleId : undefined

    if (knownBundleId) {
      Bun.$`open -b ${knownBundleId} ${url}`.quiet().nothrow()
      return { ok: true }
    }

    const ok = Utils.openExternal(url)
    if (!ok) {
      return { ok: false, error: 'openExternal returned false' }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}
