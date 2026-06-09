import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { chdirToRepoRoot } from '../../support/lib/shared/repo_root.script.ts'

const CATALOG_PATH = 'assets/catalog/catalog.yaml'
const LEADING_DIGITS_RE = /^\d+-/
const HYPHEN_RE = /-/g
const CATALOG_ENTRY_RE = /^([a-z][a-z_0-9]+):/gm

export function catalogKeyFromSlug(slug: string): string {
  return slug.replace(LEADING_DIGITS_RE, '').replace(HYPHEN_RE, '_')
}

export function slugFromFeatureDir(featureDir: string): string {
  return path.basename(featureDir).replace(LEADING_DIGITS_RE, '')
}

export type KeyResolveResult = { ok: true; key: string } | { ok: false; key: string; warning: string }

function extractCatalogKey(catalogText: string): string[] {
  const keys: string[] = []
  for (const match of catalogText.matchAll(CATALOG_ENTRY_RE)) {
    const key = match[1]
    if (key) keys.push(key)
  }
  return keys
}

function firstEntry(entries: readonly string[]): string | undefined {
  return entries[0]
}

export function resolveCatalogKey(featureDir: string): KeyResolveResult {
  chdirToRepoRoot()
  if (!existsSync(CATALOG_PATH)) {
    const fallback = catalogKeyFromSlug(path.basename(featureDir))
    return {
      ok: false,
      key: fallback,
      warning: `spec warning: ${CATALOG_PATH} not found — derived key "${fallback}"`
    }
  }

  const catalogText = readFileSync(CATALOG_PATH, 'utf-8')
  const entries = extractCatalogKey(catalogText)

  const dirBasename = path.basename(featureDir)
  const matching = entries.filter(e => catalogText.includes(`${e}:`) && catalogText.includes(dirBasename))

  if (matching.length === 1) {
    const key = firstEntry(matching)
    if (key) return { ok: true, key }
    const fallback = catalogKeyFromSlug(path.basename(featureDir))
    return {
      ok: false,
      key: fallback,
      warning: `spec warning: matched entry is empty — derived key "${fallback}"`
    }
  }

  if (matching.length > 1) {
    const fallback = catalogKeyFromSlug(path.basename(featureDir))
    console.error(`spec warning: multiple catalog entries reference "${dirBasename}" — using derived key "${fallback}"`)
    return { ok: false, key: fallback, warning: '' }
  }

  const fallback = catalogKeyFromSlug(path.basename(featureDir))
  console.error(`spec warning: no catalog entry references "${dirBasename}" — using derived key "${fallback}"`)
  return { ok: false, key: fallback, warning: '' }
}
