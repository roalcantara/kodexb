import { afterEach, describe, expect, it } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { SCAN_PATHS_REL, clearScanPathsCache, loadScanPaths, scanPathsPath } from './scan_paths.script.ts'

describe('scan_paths.script', () => {
  let tmpRoots: string[] = []

  afterEach(() => {
    for (const r of tmpRoots) {
      try {
        rmSync(r, { recursive: true, force: true })
      } catch {
        /* ok */
      }
    }
    tmpRoots = []
    clearScanPathsCache()
  })

  function writeYaml(content: string): string {
    const root = mkdtempSync(path.join(tmpdir(), 'scan-paths-'))
    tmpRoots.push(root)
    mkdirSync(path.join(root, 'assets/catalog'), { recursive: true })
    writeFileSync(path.join(root, SCAN_PATHS_REL), content)
    return root
  }

  describe('when the yaml file is well-formed', () => {
    it('returns the declared (root, glob) pairs in order', async () => {
      const root = writeYaml(
        ['scan_paths:', '  - root: src', '    glob: "**/*.spec.ts"', '  - root: tools', '    glob: "**/*.spec.ts"', ''].join('\n')
      )
      const paths = await loadScanPaths(scanPathsPath(root))
      expect(paths).toEqual([
        { root: 'src', glob: '**/*.spec.ts' },
        { root: 'tools', glob: '**/*.spec.ts' }
      ])
    })
  })

  describe('when the yaml file is missing', () => {
    it('throws an error mentioning the file path', async () => {
      const root = mkdtempSync(path.join(tmpdir(), 'scan-paths-missing-'))
      tmpRoots.push(root)
      const filePath = scanPathsPath(root)
      expect(loadScanPaths(filePath)).rejects.toThrow(/scan paths file not found/)
    })
  })

  describe('without a scan_paths key', () => {
    it('throws a schema-validation error', async () => {
      const root = writeYaml('other_key: []\n')
      expect(loadScanPaths(scanPathsPath(root))).rejects.toThrow(/schema validation failed/)
    })
  })

  describe('with an empty scan_paths array', () => {
    it('throws a schema-validation error', async () => {
      const root = writeYaml('scan_paths: []\n')
      expect(loadScanPaths(scanPathsPath(root))).rejects.toThrow(/schema validation failed/)
    })
  })

  describe('with a scan path missing root or glob', () => {
    it('throws a schema-validation error', async () => {
      const root = writeYaml(['scan_paths:', '  - root: src', ''].join('\n'))
      expect(loadScanPaths(scanPathsPath(root))).rejects.toThrow(/schema validation failed/)
    })
  })
})
