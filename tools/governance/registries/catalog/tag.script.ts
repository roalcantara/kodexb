import { existsSync } from 'node:fs'
import path from 'node:path'
import { Glob } from 'bun'
import { repoRoot } from '../../../support/lib/shared/repo_root.script.ts'
import {
  type CatalogEntry,
  type CatalogFile,
  catalogRunTag,
  findByCatalogRef,
  listCatalogKeys,
  loadCatalog
} from './catalog.script.ts'

export const CATALOG_TAG_TOKEN = /@([a-z][a-z0-9_]*)\b/g
export const AC_SLICE_ID_RE = /^sf(\d+)ac(\d+)$/i
export const AC_TAG_RE = /^@ac:SF-(\d+)_AC(\d+)$/i
export const RESERVED_RUN_TAGS = new Set([
  'smoke',
  'regression',
  'e2e',
  'p0',
  'p1',
  'p2',
  'wip',
  'skip',
  'only',
  'bdd',
  'gherkin',
  'unit',
  'todo',
  'native'
])

export function extractCatalogRunTagsFromLine(line: string): string[] {
  const tags: string[] = []
  for (const match of line.matchAll(CATALOG_TAG_TOKEN)) {
    const token = match[1]
    const idx = match.index ?? 0
    const after = line[idx + match[0].length]
    if (after === ':') continue
    if (!token || RESERVED_RUN_TAGS.has(token)) continue
    tags.push(token)
  }
  return tags
}

export function lineHasCatalogTag(line: string, tag: string): boolean {
  const key = tag.startsWith('@') ? tag.slice(1) : tag
  const tokens = extractCatalogRunTagsFromLine(line)
  return tokens.includes(key)
}

export function parseAcSliceId(slice: string): string | null {
  const match = slice.trim().match(AC_SLICE_ID_RE)
  if (!match?.[1] || !match[2]) return null
  return `@ac:SF-${match[1]}_AC${match[2]}`
}

export function acTagFromSliceId(slice: string): string | null {
  return parseAcSliceId(slice)
}

export function sliceIdFromAcTag(acTag: string): string | null {
  const normalized = acTag.startsWith('@') ? acTag : `@${acTag}`
  const match = normalized.match(AC_TAG_RE)
  if (!match?.[1] || !match[2]) return null
  return `sf${match[1]}ac${match[2]}`.toLowerCase()
}

export function lineHasAcTag(line: string, acTag: string): boolean {
  const want = acTag.startsWith('@') ? acTag : `@${acTag}`
  return line.includes(want)
}

export function isAcSliceId(ref: string): boolean {
  return AC_SLICE_ID_RE.test(ref.trim())
}

export type TagLayerFilter = {
  e2e: boolean
  unit: boolean
}

export type TagResolution = {
  catalogId: string
  entry: CatalogEntry
  tag: string
  features: string[]
  units: string[]
}

export function splitTaggedPaths(paths: string[]): { features: string[]; units: string[] } {
  const features = new Set<string>()
  const units = new Set<string>()
  for (const p of paths) {
    if (p.endsWith('.feature')) features.add(p)
    else if (p.includes('.spec.')) units.add(p)
  }
  return {
    features: [...features].sort(),
    units: [...units].sort()
  }
}

async function collectPathsMatchingTag(
  scanRoot: string,
  pattern: string,
  want: string,
  root: string,
  scanAllLines: boolean
): Promise<string[]> {
  const matches: string[] = []
  const glob = new Glob(pattern)
  const candidates: string[] = []
  for await (const rel of glob.scan({ cwd: scanRoot, onlyFiles: true })) {
    candidates.push(path.join(scanRoot, rel))
  }
  const texts = await Promise.all(candidates.map(full => Bun.file(full).text()))
  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i]
    const text = texts[i]
    if (!candidate || !text) continue
    if (scanAllLines) {
      const hit = text.split('\n').some(line => lineHasCatalogTag(line, want))
      if (hit) matches.push(path.relative(root, candidate).replace(/\\/g, '/'))
    } else {
      const firstLine = text.split('\n')[0] ?? ''
      if (lineHasCatalogTag(firstLine, want)) {
        matches.push(path.relative(root, candidate).replace(/\\/g, '/'))
      }
    }
  }
  return matches
}

export const TAG_SCAN_PATHS: Array<{ root: string; glob: string }> = [
  { root: 'assets/features', glob: '**/*.feature' },
  { root: 'src', glob: '**/*.spec.ts' },
  { root: 'src', glob: '**/*.spec.tsx' }
]

export async function grepPathsWithTag(tag: string, root = repoRoot()): Promise<string[]> {
  const want = tag.startsWith('@') ? tag : `@${tag}`
  const found = new Set<string>()
  const batches = await Promise.all(
    TAG_SCAN_PATHS.map(({ root: rootRel, glob: pattern }) => {
      const scanRoot = path.join(root, rootRel)
      if (!existsSync(scanRoot)) return Promise.resolve([] as string[])
      const scanAllLines = rootRel === 'assets/features'
      return collectPathsMatchingTag(scanRoot, pattern, want, root, scanAllLines)
    })
  )
  for (const batch of batches) {
    for (const p of batch) found.add(p)
  }
  return [...found].sort()
}

export async function resolveTagKey(ref: string, catalog?: CatalogFile): Promise<TagResolution> {
  const cat = catalog ?? (await loadCatalog())
  const match = findByCatalogRef(cat, ref)
  if (!match) {
    const known = listCatalogKeys(cat)
      .map(id => catalogRunTag(id))
      .join(', ')
    throw new Error(`no catalog entry for ${ref} (known: ${known || 'none'})`)
  }

  const tagged = await grepPathsWithTag(match.tag)
  const { features, units } = splitTaggedPaths(tagged)

  return {
    catalogId: match.id,
    entry: match.entry,
    tag: match.tag,
    features,
    units
  }
}

export async function resolveAllCatalogTags(catalog?: CatalogFile): Promise<TagResolution[]> {
  const cat = catalog ?? (await loadCatalog())
  return Promise.all(listCatalogKeys(cat).map(key => resolveTagKey(key, cat)))
}

export function layerFilter(includeE2e: boolean, includeUnit: boolean): TagLayerFilter {
  if (!includeE2e && !includeUnit) return { e2e: true, unit: true }
  return { e2e: includeE2e, unit: includeUnit }
}

export function filterResolution(res: TagResolution, filter: TagLayerFilter): TagResolution {
  return {
    ...res,
    features: filter.e2e ? res.features : [],
    units: filter.unit ? res.units : []
  }
}

export function unionResolutions(resolutions: TagResolution[]): {
  features: string[]
  units: string[]
  tags: string[]
} {
  const features = new Set<string>()
  const units = new Set<string>()
  const tags = new Set<string>()
  for (const res of resolutions) {
    tags.add(res.tag)
    for (const f of res.features) features.add(f)
    for (const u of res.units) units.add(u)
  }
  return {
    features: [...features].sort(),
    units: [...units].sort(),
    tags: [...tags].sort()
  }
}

export function playwrightGrepPattern(tags: string[]): string {
  return tags.map(t => `${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-z0-9_])`).join('|')
}

export function playwrightGrepAndPattern(tags: string[]): string {
  return tags.map(t => `(?=.*${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`).join('')
}

export function bddTagExpression(catalogTags: string[], acTag?: string): string {
  const parts = catalogTags.map(t => (t.startsWith('@') ? t : `@${t}`))
  if (acTag) parts.push(acTag.startsWith('@') ? acTag : `@${acTag}`)
  return parts.join(' and ')
}

export function e2eTagExpression(catalogTags: string[], acTag?: string): string {
  return `${bddTagExpression(catalogTags, acTag)} and @e2e and not @todo`
}

export type TagListJson = {
  keys: Array<{
    catalogId: string
    title: string
    status: string
    tag: string
    specs: string[]
    features: string[]
    units: string[]
  }>
}

function formatPathList(label: string, paths: string[]): string[] {
  const lines = [`  ${label}:`]
  if (paths.length === 0) lines.push('    (none)')
  else for (const p of paths) lines.push(`    ${p}`)
  return lines
}

function formatOneTagBlock(res: TagResolution, filter: TagLayerFilter): string[] {
  const filtered = filterResolution(res, filter)
  const lines = [`${res.catalogId} (${res.tag}) [${res.entry.status ?? 'unknown'}]`]
  if (res.entry.title) lines.push(`  title: ${res.entry.title}`)
  if (res.entry.specs?.length) lines.push(`  specs: ${res.entry.specs.join(', ')}`)
  lines.push(...formatPathList('e2e', filtered.features))
  lines.push(...formatPathList('unit', filtered.units))
  lines.push('')
  return lines
}

export function formatTagListText(resolutions: TagResolution[], filter: TagLayerFilter): string {
  return resolutions
    .flatMap(res => formatOneTagBlock(res, filter))
    .join('\n')
    .trimEnd()
}

export function formatTagListJson(resolutions: TagResolution[], filter: TagLayerFilter): TagListJson {
  return {
    keys: resolutions.map(res => {
      const filtered = filterResolution(res, filter)
      return {
        catalogId: res.catalogId,
        title: res.entry.title ?? res.catalogId,
        status: res.entry.status ?? 'unknown',
        tag: res.tag,
        specs: res.entry.specs ?? [],
        features: filtered.features,
        units: filtered.units
      }
    })
  }
}

function runCommand(cmd: string[], root: string): void {
  const result = Bun.spawnSync(cmd, { cwd: root, stdout: 'inherit', stderr: 'inherit', stdin: 'inherit' })
  if (result.exitCode !== 0) process.exit(result.exitCode ?? 1)
}

export function runTaggedTests(
  resolutions: TagResolution[],
  filter: TagLayerFilter,
  root: string,
  acTag?: string
): void {
  const filtered = resolutions.map(r => filterResolution(r, filter))
  const union = unionResolutions(filtered)
  const sliceRun = Boolean(acTag)

  if (filter.unit && union.units.length > 0 && !sliceRun) {
    console.log('==> unit tests')
    runCommand(['bun', 'test', ...union.units], root)
  } else if (filter.unit && !sliceRun) {
    console.log('==> unit tests: (none)')
  } else if (sliceRun) {
    console.log('==> unit tests: (skipped — AC slice targets Gherkin scenario)')
  }

  const withFeatures = filtered.some(r => r.features.length > 0)

  if (filter.unit && !sliceRun && withFeatures && union.tags.length > 0) {
    console.log('==> bdd unit (cucumber + bun, @unit scenarios)')
    const tagArgs = union.tags.flatMap(t => ['--tags', t])
    runCommand(['bun', 'bdd/unit/runner/run_unit_bdd.script.ts', ...tagArgs], root)
  }

  const runBddE2e = filter.e2e && withFeatures && union.tags.length > 0

  if (sliceRun) {
    console.log(`==> bdd unit (cucumber + bun, ${acTag})`)
    const tagArgs = union.tags.flatMap(t => ['--tags', t])
    if (acTag) tagArgs.push('--tags', acTag)
    runCommand(['bun', 'bdd/unit/runner/run_unit_bdd.script.ts', ...tagArgs], root)
  } else if (runBddE2e) {
    console.log('==> bdd e2e (playwright-bdd)')
    const tagExpr = e2eTagExpression(union.tags, acTag)
    runCommand(['bunx', 'bddgen', 'test', '-c', 'playwright.config.ts', '--tags', tagExpr], root)
    const grepTags = playwrightGrepAndPattern([...union.tags, '@e2e'])
    runCommand(['bunx', 'playwright', 'test', '-c', 'playwright.config.ts', '--grep', grepTags], root)
  } else if (filter.e2e) {
    console.log('==> bdd e2e: (none)')
  }
}
