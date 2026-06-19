import { afterEach, describe, expect, it } from 'bun:test'
import { CatalogTestHarness } from '../../../support/lib/shared/catalog_test.script'
import { clearScanPathsCache } from './scan_paths.script'
import type { TagResolution } from './tag.script'
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
} from './tag.script'

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

  describe('playwrightGrepPattern', () => {
    describe.each([
      [['@command_palette', '@sync'], '@command_palette(?![a-z0-9_])|@sync(?![a-z0-9_])'],
      [['@sync'], '@sync(?![a-z0-9_])']
    ])('when given tags %s', (tags, expected) => {
      it(`returns pattern "${expected}"`, () => {
        expect(playwrightGrepPattern(tags)).toBe(expected)
      })
    })

    it('does not match longer snake_case tags', () => {
      const pattern = new RegExp(playwrightGrepPattern(['@sync']))
      expect(pattern.test('@sync_ui')).toBe(false)
      expect(pattern.test('@sync')).toBe(true)
    })
  })

  describe('lineHasCatalogTag', () => {
    describe.each([
      ['Feature: @sync_ui', '@sync', false],
      ['Feature: @sync', '@sync', true],
      ['// @sync_ui', '@sync', false],
      ['Feature: @sync @sync_ui', '@sync', true],
      ['Feature: @spec:sync', '@sync', false],
      ['Feature: @command_palette', 'command_palette', true],
      ['Feature: @command_palette', '@command_palette', true]
    ])('line "%s" with tag "%s"', (line, tag, expected) => {
      it(`should return ${expected}`, () => {
        expect(lineHasCatalogTag(line, tag)).toBe(expected)
      })
    })

    it('does not match tags below line 1 in unit specs', () => {
      const multiLine = 'Feature: @sync_ui\nScenario: @sync tag'
      const firstLine = multiLine.split('\n')[0] ?? ''
      expect(lineHasCatalogTag(firstLine, '@sync')).toBe(false)
      expect(lineHasCatalogTag(firstLine, '@sync_ui')).toBe(true)
    })
  })

  describe('parseAcSliceId', () => {
    it('maps sf1ac1 to @ac:SF-1_AC1', () => {
      expect(parseAcSliceId('sf1ac1')).toBe('@ac:SF-1_AC1')
      expect(acTagFromSliceId('SF2AC3')).toBe('@ac:SF-2_AC3')
      expect(sliceIdFromAcTag('@ac:SF-1_AC1')).toBe('sf1ac1')
    })
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
    const harness = new CatalogTestHarness()

    afterEach(() => {
      harness.cleanup()
      clearScanPathsCache()
    })

    function writeDefaultScanPaths(): void {
      harness.writeFile(
        'assets/catalog/scan_paths.yaml',
        [
          'scan_paths:',
          '  - root: assets/features',
          '    glob: "**/*.feature"',
          '  - root: src',
          '    glob: "**/*.spec.ts"',
          '  - root: packages/ops',
          '    glob: "**/*.spec.ts"',
          ''
        ].join('\n')
      )
    }

    it('finds a line-1 // @tag comment in a packages/ops/src/-rooted spec', async () => {
      const root = harness.init('tag-scan-tools-')
      writeDefaultScanPaths()
      harness.writeFile(
        'packages/ops/src/governance/security/scan.script.spec.ts',
        "// @security\nimport { describe, it } from 'bun:test'\ndescribe('scan', () => it('runs', () => {}))\n"
      )
      const paths = await grepPathsWithTag('@security', root)
      expect(paths).toContain('packages/ops/src/governance/security/scan.script.spec.ts')
    })
  })
})
