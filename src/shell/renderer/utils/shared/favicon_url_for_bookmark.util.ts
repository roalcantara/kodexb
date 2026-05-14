/**
 * Resolves a remote favicon URL for a bookmark `key` when it is an http(s)
 * URL. Uses DuckDuckGo's icon service (same origin pattern as many launchers).
 */
import { parseHttpUrl } from './parse_http_url.util'

export function faviconUrlForBookmarkKey(key: string): string | null {
  const parsed = parseHttpUrl(key)
  if (parsed === null) return null
  return `https://icons.duckduckgo.com/ip3/${parsed.hostname}.ico`
}
