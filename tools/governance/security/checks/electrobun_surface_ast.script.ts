import { readFileSync } from 'node:fs'

export type SurfaceViewNode = {
  source: string
  id: string
  url: string
  hasSandboxTrue: boolean
  hasPartition: boolean
  hasNavigationList: boolean
}

export function parseElectrobunViews(configPath: string): SurfaceViewNode[] {
  try {
    const text = readFileSync(configPath, 'utf8')
    const blocks = text.split(/\bexternalViews\b/)
    if (blocks.length <= 1) return []

    const tail = blocks.slice(1).join('\n')
    const nodes = tail
      .split('},')
      .map(chunk => chunk.trim())
      .filter(Boolean)

    return nodes.map(node => {
      const idMatch = node.match(/id\s*:\s*['"]([^'"]+)['"]/)
      const urlMatch = node.match(/url\s*:\s*['"]([^'"]+)['"]/)
      const id = idMatch?.[1] ?? ''
      const url = urlMatch?.[1] ?? ''

      // SH-3 AC1: MUST NOT contain '*' or match any protocol other than 'views://' or 'https://'
      const navMatch = node.match(/navigation\s*:\s*\[([^\]]+)\]/)
      const navContent = navMatch?.[1] ?? ''
      const hasWildcard = navContent.includes('*')
      const invalidProtocol =
        navContent.length > 0 &&
        navContent
          .split(',')
          .map(p => p.trim().replace(/^['"]|['"]$/g, ''))
          .some(
            p =>
              p.length > 0 &&
              !p.startsWith('views://') &&
              !p.startsWith('https://') &&
              !p.startsWith('http://localhost')
          )

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
