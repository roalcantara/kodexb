import { readFileSync } from 'node:fs'

export type SecretsRule = {
  id: string
  pattern: string
}

export function loadSecretsRules(filePath: string): SecretsRule[] {
  try {
    const raw = readFileSync(filePath, 'utf8')
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter((item): item is SecretsRule => {
        if (!item || typeof item !== 'object') return false
        const candidate = item as Record<string, unknown>
        return typeof candidate.id === 'string' && typeof candidate.pattern === 'string'
      })
      .map(item => ({ id: item.id, pattern: item.pattern }))
  } catch (error) {
    const e = error as NodeJS.ErrnoException
    if (e.code === 'ENOENT') return []
    throw new Error(`failed to load secrets rules from ${filePath}: ${e.message}`, { cause: error })
  }
}
