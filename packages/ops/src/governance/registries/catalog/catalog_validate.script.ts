import { existsSync } from 'node:fs'
import path from 'node:path'
import { Glob } from 'bun'
import { repoRoot } from '../../../support/lib/shared/repo_root.script'
import { type CatalogEntry, catalogPath, catalogRunTag, listCatalogKeys, loadCatalog } from './catalog.script'
import type { CatalogFinding, CatalogFindingCategory, CatalogValidatePayload } from './catalog_validate.types'
import { loadScanPaths, SCAN_PATHS_REL, scanPathsPath } from './scan_paths.script'
import { extractCatalogRunTagsFromLine, grepPathsWithTag, lineHasCatalogTag, resolveTagKey } from './tag.script'

export { RESERVED_RUN_TAGS } from './tag.script'

export const ALLOWED_ENTRY_FIELDS = new Set(['title', 'status', 'specs', 'superseded_by'])
export const FORBIDDEN_ENTRY_FIELDS = ['features', 'units', 'record'] as const
export const CATALOG_KEY_PATTERN = /^[a-z][a-z0-9_]*$/

function bumpSummary(summary: Record<string, number>, category: CatalogFindingCategory): void {
  summary[category] = (summary[category] ?? 0) + 1
}

function findingLevel(_category: CatalogFindingCategory): 'error' | 'warn' {
  return 'error'
}

function addFinding(
  findings: CatalogFinding[],
  summary: Record<string, number>,
  category: CatalogFindingCategory,
  message: string,
  key?: string,
  file?: string
): void {
  findings.push({ category, level: findingLevel(category), key, file, message })
  bumpSummary(summary, category)
}

function validateCatalogKey(findings: CatalogFinding[], summary: Record<string, number>, key: string): void {
  if (!CATALOG_KEY_PATTERN.test(key)) {
    addFinding(findings, summary, 'schema', `catalog key must be snake_case: ${key}`, key)
  }
}

function validateEntrySchema(
  findings: CatalogFinding[],
  summary: Record<string, number>,
  key: string,
  entry: CatalogEntry
): void {
  if (typeof entry.title !== 'string' || entry.title.trim() === '') {
    addFinding(findings, summary, 'schema', `${key}.title required`, key)
  }
  if (typeof entry.status !== 'string' || entry.status.trim() === '') {
    addFinding(findings, summary, 'schema', `${key}.status required`, key)
  }
  if (!Array.isArray(entry.specs)) {
    addFinding(findings, summary, 'schema', `${key}.specs must be a list`, key)
  } else if (entry.specs.length === 0) {
    addFinding(findings, summary, 'schema', `${key}.specs must not be empty`, key)
  }

  for (const forbidden of FORBIDDEN_ENTRY_FIELDS) {
    if (Object.hasOwn(entry, forbidden)) {
      addFinding(findings, summary, 'forbidden_field', `${key} must not have forbidden field: ${forbidden}`, key)
    }
  }

  for (const field of Object.keys(entry)) {
    if (!ALLOWED_ENTRY_FIELDS.has(field)) {
      addFinding(findings, summary, 'schema', `${key} has unknown field: ${field}`, key)
    }
  }
}

async function readFirstLine(filePath: string): Promise<string> {
  const text = await Bun.file(filePath).text()
  return text.split('\n')[0] ?? ''
}

async function readAllLines(filePath: string): Promise<string[]> {
  const text = await Bun.file(filePath).text()
  return text.split('\n')
}

export async function validateTagPlacement(
  findings: CatalogFinding[],
  summary: Record<string, number>,
  relPath: string,
  tag: string,
  key: string,
  root: string
): Promise<void> {
  const full = path.join(root, relPath)

  if (relPath.endsWith('.feature')) {
    const allLines = await readAllLines(full)
    const tagFound = allLines.some(line => lineHasCatalogTag(line, tag))
    if (!tagFound) {
      addFinding(
        findings,
        summary,
        'placement',
        `${relPath}: catalog tag ${tag} must appear on a Feature or Scenario tag line`,
        key,
        relPath
      )
    }
    return
  }

  if (relPath.includes('.spec.')) {
    const first = await readFirstLine(full)
    const trimmed = first.trim()
    if (!trimmed.startsWith('//') || !lineHasCatalogTag(trimmed, tag)) {
      addFinding(
        findings,
        summary,
        'placement',
        `${relPath}: catalog tag ${tag} must appear in line 1 comment (// ${tag})`,
        key,
        relPath
      )
    }
  }
}

async function collectMembershipTagsInFile(relPath: string, root: string): Promise<string[]> {
  const full = path.join(root, relPath)

  if (relPath.endsWith('.feature')) {
    const allLines = await readAllLines(full)
    const tags = new Set<string>()
    for (const line of allLines) {
      for (const t of extractCatalogRunTagsFromLine(line)) tags.add(t)
    }
    return [...tags]
  }

  if (relPath.includes('.spec.')) {
    const first = await readFirstLine(full)
    const trimmed = first.trim()
    if (!trimmed.startsWith('//')) return []
    return extractCatalogRunTagsFromLine(trimmed)
  }

  return []
}

async function scanOrphanTags(
  findings: CatalogFinding[],
  summary: Record<string, number>,
  catalogKeys: Set<string>,
  root: string
): Promise<void> {
  const seen = new Set<string>()
  const scanPaths = await loadScanPaths(scanPathsPath(root))
  for (const { root: rootRel, glob: pattern } of scanPaths) {
    const scanRoot = path.join(root, rootRel)
    if (!existsSync(scanRoot)) continue
    const glob = new Glob(pattern)
    for await (const rel of glob.scan({ cwd: scanRoot, onlyFiles: true })) {
      const relPath = path.join(rootRel, rel).replace(/\\/g, '/')
      const tokens = await collectMembershipTagsInFile(relPath, root)
      for (const token of tokens) {
        if (catalogKeys.has(token)) continue
        const tag = `@${token}`
        const id = `${relPath}:${tag}`
        if (seen.has(id)) continue
        seen.add(id)
        addFinding(
          findings,
          summary,
          'orphan_tag',
          `${relPath}: orphan catalog run tag ${tag} (not in catalog.yaml)`,
          token,
          relPath
        )
      }
    }
  }
}

export type ValidateOptions = {
  feature?: string
  root?: string
}

export async function runValidate(options: ValidateOptions = {}): Promise<CatalogValidatePayload> {
  const root = options.root ?? repoRoot()
  const findings: CatalogFinding[] = []
  const summary: Record<string, number> = {}
  const catalog = await loadCatalog(catalogPath(root))
  const keys = listCatalogKeys(catalog)
  const catalogKeySet = new Set(keys)
  const scope = options.feature?.trim()

  if (scope && !(scope in catalog)) {
    addFinding(findings, summary, 'schema', `no catalog entry for ${scope}`, scope)
    summary.total = findings.length
    return { valid: false, findings, summary }
  }

  const keysToCheck = scope ? [scope] : keys

  for (const key of keys) {
    if (!scope) validateCatalogKey(findings, summary, key)
  }

  for (const key of keysToCheck) {
    const entry = catalog[key]
    if (!entry) continue
    validateEntrySchema(findings, summary, key, entry)

    const tag = catalogRunTag(key)
    const tagged = await grepPathsWithTag(tag, root)
    const resolution = await resolveTagKey(key, catalog)

    if (entry.status === 'shipped' && tagged.length === 0) {
      addFinding(
        findings,
        summary,
        'shipped_no_tags',
        `${key} [shipped]: zero grep hits for ${tag} — tag Gherkin + unit specs (scan roots: ${SCAN_PATHS_REL})`,
        key
      )
    }

    for (const relPath of tagged) {
      await validateTagPlacement(findings, summary, relPath, tag, key, root)
    }

    if (scope && resolution.features.length === 0 && resolution.units.length === 0) {
      addFinding(findings, summary, 'shipped_no_tags', `${key}: no tagged executables found for ${tag}`, key)
    }
  }

  if (!scope) {
    await scanOrphanTags(findings, summary, catalogKeySet, root)
  }

  summary.total = findings.length
  summary.errors = findings.filter(f => f.level === 'error').length
  summary.warnings = findings.filter(f => f.level === 'warn').length
  const hasErrors = findings.some(f => f.level === 'error')
  return { valid: !hasErrors, findings, summary }
}

export function renderValidate(payload: CatalogValidatePayload, json: boolean, raw: boolean): void {
  if (json) {
    console.log(JSON.stringify(payload, null, 2))
    return
  }

  if (raw) {
    console.log(
      `catalog validate: ${payload.valid ? 'OK' : 'FAILED'} (${payload.summary.errors} errors, ${payload.summary.warnings} warnings)`
    )
    for (const [k, v] of Object.entries(payload.summary)) {
      if (k === 'total' || k === 'errors' || k === 'warnings') continue
      if (v > 0) console.log(`  ${k}: ${v}`)
    }
    for (const f of payload.findings) {
      const prefix = f.key ? `${f.key}: ` : f.file ? `${f.file}: ` : ''
      const level = f.level === 'warn' ? 'warn' : 'error'
      console.log(`catalog validate: [${level}] ${prefix}${f.message}`)
    }
    return
  }

  console.log(
    `catalog validate: ${payload.valid ? 'OK' : 'FAILED'} (${payload.summary.errors} errors, ${payload.summary.warnings} warnings)`
  )
  for (const f of payload.findings) {
    const prefix = f.key ? `${f.key}: ` : f.file ? `${f.file}: ` : ''
    console.log(`  [${f.level}/${f.category}] ${prefix}${f.message}`)
  }
}
