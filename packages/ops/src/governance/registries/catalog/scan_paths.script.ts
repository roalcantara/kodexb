import path from 'node:path'
import { type Static, Type } from '@sinclair/typebox'
import { Value } from '@sinclair/typebox/value'
import { repoRoot } from '../../../support/lib/shared/repo_root.script'

export const SCAN_PATHS_REL = 'assets/catalog/scan_paths.yaml'

export const ScanPathSchema = Type.Object({
  root: Type.String({ minLength: 1 }),
  glob: Type.String({ minLength: 1 })
})

export const ScanPathsFileSchema = Type.Object({
  scan_paths: Type.Array(ScanPathSchema, { minItems: 1 })
})

export type ScanPath = Static<typeof ScanPathSchema>
export type ScanPathsFile = Static<typeof ScanPathsFileSchema>

export function scanPathsPath(root = repoRoot()): string {
  return path.join(root, SCAN_PATHS_REL)
}

let cached: { filePath: string; paths: readonly ScanPath[] } | null = null

export function clearScanPathsCache(): void {
  cached = null
}

export async function loadScanPaths(filePath = scanPathsPath()): Promise<readonly ScanPath[]> {
  if (cached && cached.filePath === filePath) return cached.paths
  const file = Bun.file(filePath)
  if (!(await file.exists())) {
    throw new Error(`scan paths file not found: ${filePath}`)
  }
  const parsed = Bun.YAML.parse(await file.text()) as unknown
  if (!Value.Check(ScanPathsFileSchema, parsed)) {
    const errors = [...Value.Errors(ScanPathsFileSchema, parsed)].map(e => `${e.path} ${e.message}`).join(', ')
    throw new Error(`${SCAN_PATHS_REL} schema validation failed: ${errors}`)
  }
  const immutablePaths = Object.freeze(
    parsed.scan_paths.map(scanPath => Object.freeze({ ...scanPath }))
  ) as readonly ScanPath[]
  cached = { filePath, paths: immutablePaths }
  return immutablePaths
}
