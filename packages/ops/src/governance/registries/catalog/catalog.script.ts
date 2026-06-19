import path from 'node:path'
import { repoRoot } from '../../../support/lib/shared/repo_root.script'

export const CATALOG_REL = 'assets/catalog/catalog.yaml'

export type CatalogEntry = {
  title?: string
  status?: string
  specs?: string[]
  superseded_by?: string | null
}

export type CatalogFile = Record<string, CatalogEntry>

export function catalogPath(root = repoRoot()): string {
  return path.join(root, CATALOG_REL)
}

export function normalizeTag(raw: string): string {
  const t = raw.trim()
  return t.startsWith('@') ? t : `@${t}`
}

/** Run tag derived from catalog key — single source of truth for tagging. */
export function catalogRunTag(catalogId: string): string {
  return normalizeTag(catalogId)
}

export async function loadCatalog(filePath = catalogPath()): Promise<CatalogFile> {
  const file = Bun.file(filePath)
  if (!(await file.exists())) {
    throw new Error(`catalog not found: ${filePath}`)
  }
  const parsed = Bun.YAML.parse(await file.text()) as unknown
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('catalog.yaml must be a YAML mapping')
  }
  return parsed as CatalogFile
}

export function findByCatalogRef(
  catalog: CatalogFile,
  ref: string
): { id: string; entry: CatalogEntry; tag: string } | null {
  const trimmed = ref.trim()
  const asKey = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed
  if (asKey in catalog) {
    const entry = catalog[asKey]
    if (entry) return { id: asKey, entry, tag: catalogRunTag(asKey) }
  }
  const want = normalizeTag(trimmed)
  for (const [id, entry] of Object.entries(catalog)) {
    if (catalogRunTag(id) === want && entry) {
      return { id, entry, tag: want }
    }
  }
  return null
}

export function listCatalogKeys(catalog: CatalogFile): string[] {
  return Object.keys(catalog).sort()
}

export type CatalogListRow = {
  key: string
  title: string
  status: string
  specs: string[]
  superseded_by: string | null
}

export function catalogListRows(catalog: CatalogFile): CatalogListRow[] {
  return listCatalogKeys(catalog).map(key => {
    const entry = catalog[key] ?? {}
    return {
      key,
      title: entry.title ?? key,
      status: entry.status ?? 'unknown',
      specs: entry.specs ?? [],
      superseded_by: entry.superseded_by ?? null
    }
  })
}
