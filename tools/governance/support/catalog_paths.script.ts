import { readFileSync } from 'node:fs'
import path from 'node:path'
import { repoRoot } from '../../support/lib/shared/repo_root.script.ts'

type CatalogPaths = {
  scan_paths: Array<{ root: string; glob: string }>
  specs_root: string
}

const DEFAULT_SPECS_ROOT = 'assets/specs'

function loadCatalogPaths(): CatalogPaths {
  const filePath = path.join(repoRoot(), 'assets/catalog/scan_paths.yaml')
  const parsed = Bun.YAML.parse(readFileSync(filePath, 'utf-8')) as Partial<CatalogPaths>

  return {
    scan_paths: Array.isArray(parsed.scan_paths) ? parsed.scan_paths : [],
    specs_root:
      typeof parsed.specs_root === 'string' && parsed.specs_root.length > 0 ? parsed.specs_root : DEFAULT_SPECS_ROOT
  }
}

export const catalogPaths = loadCatalogPaths()
