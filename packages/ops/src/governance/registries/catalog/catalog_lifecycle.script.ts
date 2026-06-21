import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { readTextFileSync } from '../../../support/lib/shared/text_file.script'
import { catalogKeyFromSlug, slugFromFeatureDir } from '../../specs/resolve_catalog_key.script'
import { type CatalogEntry, type CatalogFile, catalogPath, loadCatalog } from './catalog.script'
import { runShip } from './catalog_ship.script'

export type RegisterResult = {
  action: 'created' | 'unchanged'
  key: string
  specSlug: string
  message: string
}

export type PromoteResult = {
  action: 'promoted' | 'unchanged' | 'skipped'
  key: string
  ready: boolean
  message: string
}

export function findEntryBySpecSlug(
  catalog: CatalogFile,
  specSlug: string
): { id: string; entry: CatalogEntry } | null {
  for (const [id, entry] of Object.entries(catalog)) {
    if (entry.specs?.includes(specSlug)) return { id, entry }
  }
  return null
}

function titleFromSpecMd(featureDir: string): string {
  const specPath = path.join(featureDir, 'spec.md')
  const result = readTextFileSync(specPath)
  const text = result.isOk() ? result.value : ''
  const heading = text.split('\n').find(line => /^#\s+/.test(line))
  if (heading) return heading.replace(/^#\s+/, '').trim()
  return slugFromFeatureDir(featureDir).replace(/-/g, ' ')
}

function yamlQuoteTitle(title: string): string {
  if (/[:#"'[\]{}&,*?|>-]/.test(title)) return `"${title.replace(/"/g, '\\"')}"`
  return title
}

export function appendCatalogEntryBlock(fileText: string, key: string, title: string, specSlug: string): string {
  const block = [
    '',
    `${key}:`,
    `  title: ${yamlQuoteTitle(title)}`,
    '  status: in-progress',
    '  specs:',
    `    - ${specSlug}`,
    '  superseded_by: null',
    ''
  ].join('\n')
  return `${fileText.trimEnd()}${block}`
}

export function patchCatalogStatus(fileText: string, key: string, status: string): string {
  const lines = fileText.split('\n')
  let inKey = false
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    if (/^[a-z][a-z0-9_]*:$/.test(line)) {
      inKey = line === `${key}:`
      continue
    }
    if (inKey && /^\s+status:/.test(line)) {
      lines[i] = line.replace(/status:\s*.+$/, `status: ${status}`)
      return lines.join('\n')
    }
  }
  throw new Error(`catalog lifecycle: status line not found for key "${key}"`)
}

function readCatalogSync(root?: string): CatalogFile {
  const filePath = catalogPath(root)
  const parsed = Bun.YAML.parse(readFileSync(filePath, 'utf-8')) as unknown
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('catalog.yaml must be a YAML mapping')
  }
  return parsed as CatalogFile
}

export function registerCatalogEntry(featureDir: string, root?: string): RegisterResult {
  const specSlug = path.basename(featureDir)
  const existing = findEntryBySpecSlug(readCatalogSync(root), specSlug)
  if (existing) {
    return {
      action: 'unchanged',
      key: existing.id,
      specSlug,
      message: `catalog entry "${existing.id}" already references ${specSlug}`
    }
  }

  const key = catalogKeyFromSlug(specSlug)
  const catalog = readCatalogSync(root)
  if (key in catalog) {
    throw new Error(
      `catalog key "${key}" exists but does not reference ${specSlug} — add specs manually or pick a new key`
    )
  }

  const filePath = catalogPath(root)
  const before = readFileSync(filePath, 'utf-8')
  const after = appendCatalogEntryBlock(before, key, titleFromSpecMd(featureDir), specSlug)
  writeFileSync(filePath, after, 'utf-8')

  return {
    action: 'created',
    key,
    specSlug,
    message: `registered ${key} as in-progress for ${specSlug}`
  }
}

export async function promoteCatalogEntry(
  key: string,
  opts: { dryRun?: boolean; root?: string } = {}
): Promise<PromoteResult> {
  const ship = await runShip({ key, root: opts.root })
  if (ship.status === 'shipped') {
    return {
      action: 'unchanged',
      key: ship.key,
      ready: ship.ready,
      message: `${ship.key} already shipped — no catalog change`
    }
  }

  if (!ship.ready) {
    return {
      action: 'skipped',
      key: ship.key,
      ready: false,
      message: `catalog promote blocked — ship gate not ready for ${ship.key}`
    }
  }

  if (opts.dryRun) {
    return {
      action: 'promoted',
      key: ship.key,
      ready: true,
      message: `dry-run: would set ${ship.key} status to shipped`
    }
  }

  const filePath = catalogPath(opts.root)
  const before = readFileSync(filePath, 'utf-8')
  const after = patchCatalogStatus(before, ship.key, 'shipped')
  writeFileSync(filePath, after, 'utf-8')

  return {
    action: 'promoted',
    key: ship.key,
    ready: true,
    message: `promoted ${ship.key} to shipped`
  }
}

export async function promoteCatalogForFeatureDir(
  featureDir: string,
  opts: { dryRun?: boolean; root?: string; catalogKey?: string } = {}
): Promise<PromoteResult> {
  let key = opts.catalogKey?.trim()
  if (!key) {
    const specSlug = path.basename(featureDir)
    const match = findEntryBySpecSlug(await loadCatalog(catalogPath(opts.root)), specSlug)
    if (!match) {
      return {
        action: 'skipped',
        key: catalogKeyFromSlug(specSlug),
        ready: false,
        message: `no catalog entry references ${specSlug} — run catalog register first`
      }
    }
    key = match.id
  }
  return promoteCatalogEntry(key, opts)
}
