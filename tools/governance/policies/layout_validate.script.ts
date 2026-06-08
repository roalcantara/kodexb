/**
 * Validate tracked tools/ top-level layout against tools/tools.manifest.toml.
 * Skips gitignored generated paths (benchmarks/results, graphify-out/).
 */
import path from 'node:path'
import { chdirToRepoRoot } from '../../support/lib/shared/repo_root.script.ts'

type ManifestEntry = { path: string; kind: 'folder' | 'file' }

const ALLOWED_UNMANIFESTED_TOPS = new Set(['__tests__'])

function parseManifest(toml: string): ManifestEntry[] {
  const entries: ManifestEntry[] = []
  let kind: 'folder' | 'file' = 'folder'
  let currentPath: string | null = null

  for (const line of toml.split('\n')) {
    const trimmed = line.trim()
    if (trimmed === '[[folder]]') {
      if (currentPath) entries.push({ path: currentPath, kind })
      kind = 'folder'
      currentPath = null
      continue
    }
    if (trimmed === '[[file]]') {
      if (currentPath) entries.push({ path: currentPath, kind })
      kind = 'file'
      currentPath = null
      continue
    }
    const m = trimmed.match(/^path\s*=\s*"([^"]+)"/)
    if (m?.[1]) currentPath = m[1]
  }
  if (currentPath) entries.push({ path: currentPath, kind })
  return entries
}

function gitLsFilesTools(root: string): string[] {
  const r = Bun.spawnSync(['git', 'ls-files', 'tools'], { cwd: root })
  if (r.exitCode !== 0) {
    throw new Error('git ls-files tools failed')
  }
  return new TextDecoder()
    .decode(r.stdout)
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
}

export function topLevelFromTracked(files: string[]): Set<string> {
  const tops = new Set<string>()
  for (const f of files) {
    const rel = f.replace(/^tools\//, '')
    const slash = rel.indexOf('/')
    const top = slash === -1 ? rel : rel.slice(0, slash)
    if (top) tops.add(top)
  }
  return tops
}

export function findUnmanifestedTops(manifestPaths: Set<string>, tops: Set<string>): string[] {
  const errors: string[] = []
  for (const top of tops) {
    if (ALLOWED_UNMANIFESTED_TOPS.has(top)) {
      continue
    }
    if (!manifestPaths.has(top)) {
      errors.push(`unmanifested tools/${top}/`)
    }
  }
  return errors
}

async function main(): Promise<void> {
  const root = chdirToRepoRoot()
  const manifestPath = path.join(root, 'tools/tools.manifest.toml')
  const tomlText = await Bun.file(manifestPath).text()
  const manifestEntries = parseManifest(tomlText)
  const manifestPaths = new Set(manifestEntries.map(e => e.path))

  const tracked = gitLsFilesTools(root).filter(
    f => !f.includes('/benchmarks/results/') && !f.startsWith('tools/graphify-out/')
  )

  const tops = topLevelFromTracked(tracked)
  const errors = findUnmanifestedTops(manifestPaths, tops)

  if (errors.length > 0) {
    console.error('tools layout validation failed:')
    for (const e of errors) console.error(`  - ${e}`)
    console.error(`manifest: ${manifestPath}`)
    process.exit(1)
  }

  console.log(`tools layout OK (${manifestPaths.size} manifest entries, ${tops.size} top-level tracked)`)
}

if (import.meta.main) {
  await main()
}
