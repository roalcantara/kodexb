import { readFileSync } from 'node:fs'

export type SurfaceViewNode = {
  source: string
  id: string
  url: string
  hasSandboxTrue: boolean
  hasPartition: boolean
  hasNavigationList: boolean
}

function collectBraceObjects(text: string, startIdx: number): string[] {
  const braceStart = text.indexOf('{', startIdx)
  if (braceStart < 0) return []
  const objects: string[] = []
  let i = braceStart
  let depth = 0
  while (i < text.length) {
    if (text[i] === '{') {
      if (depth === 0) {
        objects.push('')
      }
      depth++
    }
    if (depth > 0) {
      const idx = objects.length - 1
      objects[idx] = (objects[idx] ?? '') + text[i]
    }
    if (text[i] === '}') {
      depth--
      if (depth === 0) {
        i++
        break
      }
    }
    i++
  }
  return objects.filter(o => o.trim().length > 0)
}

export function parseElectrobunViews(configPath: string): SurfaceViewNode[] {
  try {
    const text = readFileSync(configPath, 'utf8')
    const extViewsIdx = text.search(/\bexternalViews\b/)
    if (extViewsIdx < 0) return []
    const afterKey = text.slice(extViewsIdx)
    const arrayStart = afterKey.indexOf('[')
    if (arrayStart < 0) return []
    const arrayEnd = afterKey.indexOf(']', arrayStart)
    if (arrayEnd < 0) return []

    const nodes = collectBraceObjects(afterKey, arrayStart)

    return nodes.map(node => {
      const idMatch = node.match(/id\s*:\s*['"]([^'"]+)['"]/)
      const urlMatch = node.match(/url\s*:\s*['"]([^'"]+)['"]/)
      const id = idMatch?.[1] ?? ''
      const url = urlMatch?.[1] ?? ''

      // SH-3 AC1: MUST NOT contain '*' and only allow 'views://' or 'https://' schemes
      const navMatch = node.match(/navigation\s*:\s*\[([^\]]+)\]/)
      const navContent = navMatch?.[1] ?? ''
      const hasWildcard = navContent.includes('*')
      const invalidProtocol =
        navContent.length > 0 &&
        navContent
          .split(',')
          .map(p => p.trim().replace(/^['"]|['"]$/g, ''))
          .some(p => p.length > 0 && !(p.startsWith('views://') || p.startsWith('https://')))

      return {
        source: node,
        id,
        url,
        hasSandboxTrue: /sandbox\s*:\s*true/.test(node),
        hasPartition: /partition\s*:\s*['"][^'"]+['"]/.test(node),
        hasNavigationList: navMatch !== null && !hasWildcard && !invalidProtocol
      }
    })
  } catch (err) {
    throw new Error(`config parse failed in ${configPath}: ${(err as Error).message}`, { cause: err })
  }
}
