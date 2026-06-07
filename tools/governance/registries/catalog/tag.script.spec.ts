import { afterEach, describe, expect, it } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { clearScanPathsCache } from './scan_paths.script.ts'
import type { TagResolution } from './tag.script.ts'
import {
  acTagFromSliceId,
  e2eTagExpression,
  extractCatalogRunTagsFromLine,
  grepPathsWithTag,
  layerFilter,
  lineHasAcTag,
  lineHasCatalogTag,
  parseAcSliceId,
  playwrightGrepAndPattern,
  playwrightGrepPattern,
  sliceIdFromAcTag,
  splitTaggedPaths,
  unionResolutions
} from './tag.script.ts'

describe('tag.lib', () => {
  it('splitTaggedPaths separates features and unit specs', () => {
    expect(
      splitTaggedPaths([
        'assets/features/e2e/command_palette.feature',
        'src/foo.component.spec.tsx',
        'src/bar.util.spec.ts'
      ])
    ).toEqual({
      features: ['assets/features/e2e/command_palette.feature'],
      units: ['src/bar.util.spec.ts', 'src/foo.component.spec.tsx']
    })
  })

  it('layerFilter defaults to both when neither flag set', () => {
    expect(layerFilter(false, false)).toEqual({ e2e: true, unit: true })
    expect(layerFilter(true, false)).toEqual({ e2e: true, unit: false })
  })

  it('unionResolutions dedupes paths and collects tags', () => {
    const a: TagResolution = {
      catalogId: 'a',
      entry: {},
      tag: '@a',
      features: ['assets/features/e2e/a.feature'],
      units: ['src/shared.spec.ts']
    }
    const b: TagResolution = {
      catalogId: 'b',
      entry: {},
      tag: '@b',
      features: ['assets/features/e2e/a.feature'],
      units: ['src/other.spec.ts']
    }
    expect(unionResolutions([a, b])).toEqual({
      features: ['assets/features/e2e/a.feature'],
      units: ['src/other.spec.ts', 'src/shared.spec.ts'],
      tags: ['@a', '@b']
    })
  })

  it('playwrightGrepPattern escapes regex metacharacters and adds boundaries', () => {
    expect(playwrightGrepPattern(['@command_palette', '@sync'])).toBe(
      '@command_palette(?![a-z0-9_])|@sync(?![a-z0-9_])'
    )
  })

  it('playwrightGrepPattern does not match longer snake_case tags', () => {
    const pattern = new RegExp(playwrightGrepPattern(['@sync']))
    expect(pattern.test('@sync_ui')).toBe(false)
    expect(pattern.test('@sync')).toBe(true)
  })

  it('lineHasCatalogTag matches by token not substring', () => {
    expect(lineHasCatalogTag('Feature: @sync_ui', '@sync')).toBe(false)
    expect(lineHasCatalogTag('Feature: @sync', '@sync')).toBe(true)
    expect(lineHasCatalogTag('// @sync_ui', '@sync')).toBe(false)
    expect(lineHasCatalogTag('Feature: @sync @sync_ui', '@sync')).toBe(true)
  })

  it('lineHasCatalogTag does not match @spec: prefixed tags', () => {
    expect(lineHasCatalogTag('Feature: @spec:sync', '@sync')).toBe(false)
  })

  it('lineHasCatalogTag with @ prefix or bare key both work', () => {
    expect(lineHasCatalogTag('Feature: @command_palette', 'command_palette')).toBe(true)
    expect(lineHasCatalogTag('Feature: @command_palette', '@command_palette')).toBe(true)
  })

  it('lineHasCatalogTag does not match tags below line 1 in unit specs', () => {
    const multiLine = 'Feature: @sync_ui\nScenario: @sync tag'
    const firstLine = multiLine.split('\n')[0] ?? ''
    expect(lineHasCatalogTag(firstLine, '@sync')).toBe(false)
    expect(lineHasCatalogTag(firstLine, '@sync_ui')).toBe(true)
  })

  it('parseAcSliceId maps sf1ac1 to @ac:SF-1_AC1', () => {
    expect(parseAcSliceId('sf1ac1')).toBe('@ac:SF-1_AC1')
    expect(acTagFromSliceId('SF2AC3')).toBe('@ac:SF-2_AC3')
    expect(sliceIdFromAcTag('@ac:SF-1_AC1')).toBe('sf1ac1')
  })

  it('lineHasAcTag finds colon tags on scenario lines', () => {
    expect(lineHasAcTag('  @sync @sync_frecency_preserve @unit @ac:SF-1_AC1', '@ac:SF-1_AC1')).toBe(true)
  })

  it('e2eTagExpression requires @e2e and excludes @todo', () => {
    expect(e2eTagExpression(['@sync_frecency_preserve'])).toBe('@sync_frecency_preserve and @e2e and not @todo')
  })

  it('playwrightGrepAndPattern requires all tags', () => {
    const pattern = new RegExp(playwrightGrepAndPattern(['@sync_frecency_preserve', '@ac:SF-1_AC1']))
    expect(pattern.test('@sync_frecency_preserve @ac:SF-1_AC1 @unit')).toBe(true)
    expect(pattern.test('@sync_frecency_preserve @unit')).toBe(false)
  })

  it('extractCatalogRunTagsFromLine filters reserved tags and @native-handoff keeps only sync', () => {
    expect(extractCatalogRunTagsFromLine('@sync @unit @todo @native-handoff')).toEqual(['sync'])
  })

  describe('grepPathsWithTag', () => {
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

    function writeFile(root: string, relPath: string, content: string): void {
      mkdirSync(path.join(root, path.dirname(relPath)), { recursive: true })
      writeFileSync(path.join(root, relPath), content)
    }

    function writeDefaultScanPaths(root: string): void {
      writeFile(
        root,
        'assets/catalog/scan_paths.yaml',
        [
          'scan_paths:',
          '  - root: assets/features',
          '    glob: "**/*.feature"',
          '  - root: src',
          '    glob: "**/*.spec.ts"',
          '  - root: tools',
          '    glob: "**/*.spec.ts"',
          ''
        ].join('\n')
      )
    }

    it('finds a line-1 // @tag comment in a tools/-rooted spec', async () => {
      const root = mkdtempSync(path.join(tmpdir(), 'tag-scan-tools-'))
      tmpRoots.push(root)
      writeDefaultScanPaths(root)
      writeFile(
        root,
        'tools/governance/security/scan.script.spec.ts',
        "// @security\nimport { describe, it } from 'bun:test'\ndescribe('scan', () => it('runs', () => {}))\n"
      )
      const paths = await grepPathsWithTag('@security', root)
      expect(paths).toContain('tools/governance/security/scan.script.spec.ts')
    })
  })
})
