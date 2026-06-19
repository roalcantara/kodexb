import { afterEach, describe, expect, it } from 'bun:test'
import { CatalogTestHarness } from '../../../support/lib/shared/catalog_test.script'
import {
  ALLOWED_ENTRY_FIELDS,
  CATALOG_KEY_PATTERN,
  FORBIDDEN_ENTRY_FIELDS,
  RESERVED_RUN_TAGS,
  validateTagPlacement
} from './catalog_validate.script'
import type { CatalogFinding } from './catalog_validate.types'

describe('catalog_validate.script', () => {
  it('CATALOG_KEY_PATTERN accepts snake_case keys', () => {
    expect(CATALOG_KEY_PATTERN.test('command_palette')).toBe(true)
    expect(CATALOG_KEY_PATTERN.test('CommandPalette')).toBe(false)
  })

  it('RESERVED_RUN_TAGS excludes CI layer tags', () => {
    expect(RESERVED_RUN_TAGS.has('smoke')).toBe(true)
    expect(RESERVED_RUN_TAGS.has('e2e')).toBe(true)
    expect(RESERVED_RUN_TAGS.has('unit')).toBe(true)
    expect(RESERVED_RUN_TAGS.has('todo')).toBe(true)
    expect(RESERVED_RUN_TAGS.has('native')).toBe(true)
    expect(RESERVED_RUN_TAGS.has('command_palette')).toBe(false)
  })

  it('FORBIDDEN_ENTRY_FIELDS blocks path lists in catalog', () => {
    expect(FORBIDDEN_ENTRY_FIELDS).toContain('features')
    expect(FORBIDDEN_ENTRY_FIELDS).toContain('units')
    expect(ALLOWED_ENTRY_FIELDS.has('title')).toBe(true)
  })

  describe('validateTagPlacement', () => {
    const harness = new CatalogTestHarness()

    afterEach(() => {
      harness.cleanup()
    })

    async function checkPlacement(
      fileName: string,
      content: string,
      tag: string
    ): Promise<{ length: number; firstCategory: string | undefined }> {
      const root = harness.init('catalog-validate-')
      const relPath = `assets/features/${fileName}`
      harness.writeFile(relPath, content)
      const findings: CatalogFinding[] = []
      const summary: Record<string, number> = {}
      await validateTagPlacement(findings, summary, relPath, tag, 'test_key', root)
      return { length: findings.length, firstCategory: findings[0]?.category }
    }

    describe.each([
      [
        'tag on Feature line (line 1)',
        'line1.feature',
        '@sync @my_test_tag\nFeature: Test\n',
        'my_test_tag',
        0,
        undefined
      ],
      [
        'tag on Scenario tag line (not line 1)',
        'scenario_line.feature',
        '@sync\nFeature: Test\n\n  @unit @my_test_tag\n  Scenario: Something\n    Given a step\n',
        'my_test_tag',
        0,
        undefined
      ],
      [
        'absent tag',
        'absent.feature',
        '@sync\nFeature: Test\n\n  @other_tag\n  Scenario: Something\n    Given a step\n',
        'absent_tag',
        1,
        'placement'
      ]
    ])('when there is a %s', (_desc, fileName, content, tag, expectedLength, expectedCategory) => {
      it(`should return ${expectedLength} findings`, async () => {
        const result = await checkPlacement(fileName, content, tag)
        expect(result.length).toBe(expectedLength)
        if (expectedCategory) {
          expect(result.firstCategory).toBe(expectedCategory)
        }
      })
    })
  })
})
