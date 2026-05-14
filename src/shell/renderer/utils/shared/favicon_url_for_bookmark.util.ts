/**
 * Resolves a remote favicon URL for a bookmark `key` when it is an http(s)
 * URL. Uses DuckDuckGo’s icon service (same origin pattern as many launchers).
 */
export function faviconUrlForBookmarkKey(key: string): string | null {
  const trimmed = key.trim()
  if (trimmed === '') return null
  try {
    const u = new URL(trimmed)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    const host = u.hostname
    if (host === '') return null
    return `https://icons.duckduckgo.com/ip3/${host}.ico`
  } catch {
    return null
  }
}
