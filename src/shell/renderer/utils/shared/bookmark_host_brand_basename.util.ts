/**
 * Hosts where the DuckDuckGo favicon is often illegible on void UI; use bundled
 * brand SVG from `assets/images/` instead (basename without `.svg`).
 */
import { parseHttpUrl } from './parse_http_url.util'

const HOST_BRAND_BASENAME: Record<string, string> = {
  'github.com': 'github',
  'www.github.com': 'github'
}

export function brandBasenameForBookmarkHost(key: string): string | null {
  const parsed = parseHttpUrl(key)
  if (parsed === null) return null
  return HOST_BRAND_BASENAME[parsed.hostname.toLowerCase()] ?? null
}
