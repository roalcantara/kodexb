import path from 'node:path'
import { readTextFileSync } from '@kb/shared/text_file'
import { type Static, Type } from '@sinclair/typebox'
import { Value } from '@sinclair/typebox/value'
import { err, ok, type Result } from 'neverthrow'

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

function readYamlFileSync(filePath: string): Result<Record<string, unknown>, Error> {
  const textResult = readTextFileSync(filePath)
  if (textResult.isErr()) return err(textResult.error)
  try {
    const raw = Bun.YAML.parse(textResult.value)
    if (!raw || typeof raw !== 'object') {
      return err(new Error(`${filePath}: expected a YAML object`))
    }
    return ok(raw as Record<string, unknown>)
  } catch (e) {
    return err(new Error(`${filePath}: ${e instanceof Error ? e.message : String(e)}`))
  }
}

function loadCatalogPaths(): CatalogPaths {
  const filePath = path.join(repoRoot(), 'assets/catalog/scan_paths.yaml')
  const parsedResult = readYamlFileSync(filePath)

  if (parsedResult.isErr()) {
    throw parsedResult.error
  }

  const parsed = parsedResult.value as Partial<CatalogPaths>

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

/** Loaded from assets/catalog/scan_paths.yaml (mirrors packages/ops/src/governance/support/catalog_paths.script). */
export const catalogPaths = loadCatalogPaths()
