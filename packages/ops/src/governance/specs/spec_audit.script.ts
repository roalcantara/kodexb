import { existsSync } from 'node:fs'
import path from 'node:path'

export function runSpecAudit(root: string, strict: boolean): void {
  const SRC = path.join(root, 'src')
  const EXEMPT_SUFFIXES = ['.d.ts', '.types.ts', '.const.ts', '.guard.ts']
  const EXEMPT_FILES = ['index.ts', 'main.ts', 'registry.ts', 'generated.ts']
  const TS_EXT_RE = /\.tsx?$/
  const SOURCE_GLOB = new Bun.Glob('**/*.{ts,tsx}')

  function hasSpec(filePath: string): boolean {
    const stem = filePath.replace(TS_EXT_RE, '')
    return existsSync(`${stem}.spec.ts`) || existsSync(`${stem}.spec.tsx`)
  }

  function isExempt(rel: string): boolean {
    if (!rel.startsWith('src/')) return true
    if (EXEMPT_SUFFIXES.some(suffix => rel.endsWith(suffix))) return true
    const base = rel.split('/').pop() ?? ''
    if (EXEMPT_FILES.some(f => base === f || base.endsWith(`.${f}`))) return true
    if (base.endsWith('.schema.ts') || base.endsWith('.schemas.ts')) return true
    if (base === 'index.ts' || base === 'shared.ts') return true
    return rel.includes('__tests__/fixtures') || rel.includes('generated')
  }

  const missing = [...SOURCE_GLOB.scanSync(SRC)]
    .flatMap(name => {
      const full = path.join(SRC, name)
      const rel = path.relative(root, full).replace(/\\/g, '/')
      if (isExempt(rel) || hasSpec(full)) return []
      return [rel]
    })
    .sort()

  for (const m of missing) console.log(m)
  if (missing.length > 0) {
    console.error('missing specs:', missing.length)
    if (strict) process.exit(1)
  }
}
