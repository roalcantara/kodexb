/**
 * Shared URL validation for bookmark key utilities.
 * Returns the URL object and hostname if valid http/https, or null.
 */
function parseHttpUrl(key: string): { url: URL; hostname: string } | null {
  const trimmed = key.trim()
  if (trimmed === '') return null
  try {
    const u = new URL(trimmed)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    const hostname = u.hostname
    if (hostname === '') return null
    return { url: u, hostname }
  } catch {
    return null
  }
}

export { parseHttpUrl }
