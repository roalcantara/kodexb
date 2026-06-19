import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { chdirToRepoRoot } from '../../support/lib/shared/repo_root.script'

const CATALOG_PATH = 'assets/catalog/catalog.yaml'
const LEADING_DIGITS_RE = /^\d+-/
const HYPHEN_RE = /-/g

export function catalogKeyFromSlug(slug: string): string {
  return slug.replace(LEADING_DIGITS_RE, '').replace(HYPHEN_RE, '_')
}

export function slugFromFeatureDir(featureDir: string): string {
  return path.basename(featureDir).replace(LEADING_DIGITS_RE, '')
}

export type KeyResolveResult = { ok: true; key: string } | { ok: false; key: string; warning: string }

function collectKeys(catalogText: string): { key: string; specs: string[] }[] {
  const doc = Bun.YAML.parse(catalogText) as Record<string, unknown>
  if (!doc || typeof doc !== 'object') return []
  return Object.entries(doc as Record<string, unknown>)
    .filter(([, v]) => v && typeof v === 'object' && !Array.isArray(v))
    .map(([key, v]) => ({
      key,
      specs: Array.isArray((v as Record<string, unknown>).specs)
        ? ((v as Record<string, unknown>).specs as string[])
        : []
    }))
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
  const entries = collectKeys(catalogText)

  const dirBasename = path.basename(featureDir)
  const matching = entries.filter(e => e.specs.includes(dirBasename))

  if (matching.length === 1 && matching[0]) {
    return { ok: true, key: matching[0].key }
  }

  if (matching.length > 1) {
    const fallback = catalogKeyFromSlug(path.basename(featureDir))
    const msg = `spec warning: multiple catalog entries reference "${dirBasename}" — using derived key "${fallback}"`
    console.error(msg)
    return { ok: false, key: fallback, warning: msg }
  }

  const fallback = catalogKeyFromSlug(path.basename(featureDir))
  const msg = `spec warning: no catalog entry references "${dirBasename}" — using derived key "${fallback}"`
  console.error(msg)
  return { ok: false, key: fallback, warning: msg }
}
