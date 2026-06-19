import { afterEach, describe, expect, it } from 'bun:test'
import { CatalogTestHarness } from '../../../support/lib/shared/catalog_test.script'
import { clearScanPathsCache, loadScanPaths, SCAN_PATHS_REL, scanPathsPath } from './scan_paths.script'

const NOT_FOUND_RE = /scan paths file not found/
const SCHEMA_FAIL_RE = /schema validation failed/

describe('scan_paths.script', () => {
  const harness = new CatalogTestHarness()

  afterEach(() => {
    harness.cleanup()
    clearScanPathsCache()
  })

  describe('when the yaml file is well-formed', () => {
    it('returns the declared (root, glob) pairs in order', async () => {
      const root = harness.init('scan-paths-ok-')
      harness.writeFile(
        SCAN_PATHS_REL,
        [
          'scan_paths:',
          '  - root: src',
          '    glob: "**/*.spec.ts"',
          '  - root: tools',
          '    glob: "**/*.spec.ts"',
          ''
        ].join('\n')
      )
      const paths = await loadScanPaths(scanPathsPath(root))
      expect(paths).toEqual([
        { root: 'src', glob: '**/*.spec.ts' },
        { root: 'tools', glob: '**/*.spec.ts' }
      ])
    })
  })

  describe.each([
    ['missing yaml file', null, NOT_FOUND_RE],
    ['missing scan_paths key', 'other_key: []\n', SCHEMA_FAIL_RE],
    ['empty scan_paths array', 'scan_paths: []\n', SCHEMA_FAIL_RE],
    ['scan path missing root or glob', 'scan_paths:\n  - root: src', SCHEMA_FAIL_RE]
  ])('when there is a %s', (_desc, content, errorRe) => {
    it('throws the expected error', () => {
      const root = harness.init('scan-paths-fail-')
      if (content !== null) {
        harness.writeFile(SCAN_PATHS_REL, content)
      }
      return expect(loadScanPaths(scanPathsPath(root))).rejects.toThrow(errorRe)
    })
  })
})
