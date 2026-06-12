import { readFileSync } from 'node:fs'
import path from 'node:path'
import { type Static, Type } from '@sinclair/typebox'
import { Value } from '@sinclair/typebox/value'

const ScanPathsEntrySchema = Type.Object({
  root: Type.String({ minLength: 1 }),
  glob: Type.String({ minLength: 1 })
})

const CatalogPathsSchema = Type.Object({
  scan_paths: Type.Array(ScanPathsEntrySchema),
  specs_root: Type.Optional(Type.String())
})

type CatalogPaths = Static<typeof CatalogPathsSchema> & { specs_root: string }

const DEFAULT_SPECS_ROOT = 'assets/specs'

function repoRoot(): string {
  const r = Bun.spawnSync(['git', 'rev-parse', '--show-toplevel'])
  if (r.exitCode !== 0) {
    throw new Error('run from inside the app git checkout')
  }
  return new TextDecoder().decode(r.stdout).trim()
}

function loadCatalogPaths(): CatalogPaths {
  const filePath = path.join(repoRoot(), 'assets/catalog/scan_paths.yaml')
  const raw = Bun.YAML.parse(readFileSync(filePath, 'utf-8'))
  const parsed = raw && typeof raw === 'object' ? (raw as Partial<CatalogPaths>) : {}

  if (!Value.Check(CatalogPathsSchema, parsed)) {
    const errors = [...Value.Errors(CatalogPathsSchema, parsed)].map(e => `${e.path} ${e.message}`).join(', ')
    throw new Error(`assets/catalog/scan_paths.yaml schema validation failed: ${errors}`)
  }

  return {
    scan_paths: Array.isArray(parsed.scan_paths)
      ? parsed.scan_paths.filter((row): row is { root: string; glob: string } =>
          Boolean(
            row &&
              typeof row === 'object' &&
              typeof (row as { root?: unknown }).root === 'string' &&
              (row as { root: string }).root.length > 0 &&
              typeof (row as { glob?: unknown }).glob === 'string' &&
              (row as { glob: string }).glob.length > 0
          )
        )
      : [],
    specs_root: parsed.specs_root && parsed.specs_root.length > 0 ? parsed.specs_root : DEFAULT_SPECS_ROOT
  }
}

/** Loaded from assets/catalog/scan_paths.yaml (mirrors tools/governance/support/catalog_paths.script). */
export const catalogPaths = loadCatalogPaths()
