/** Known browser bundle IDs for frontmost-app-based URL routing.
 *
 * Ported from arkn's `COMMON_APPS` in actions.helper.ts.
 * Used by browser.adapter to open URLs in the frontmost known browser
 * instead of the system default.
 */
export const KNOWN_BROWSERS: Record<string, string> = {
  Chrome: 'com.google.Chrome',
  Zen: 'app.zen-browser.zen',
  Firefox: 'org.mozilla.firefox',
  Safari: 'com.apple.Safari',
  Edge: 'com.microsoft.edgemac',
  Brave: 'com.brave.Browser',
  Vivaldi: 'com.vivaldi.Vivaldi',
  Arc: 'com.arc.browser',
  Opera: 'com.operasoftware.Opera',
  Iridium: 'com.iridium.browser',
  Orion: 'com.orion.browser'
} as const

/** Set of known browser bundle ids for fast lookup. */
export const KNOWN_BROWSER_BUNDLE_IDS: ReadonlySet<string> = new Set(Object.values(KNOWN_BROWSERS))
