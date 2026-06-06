import { afterEach, describe, expect, it } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
  ALLOWED_ENTRY_FIELDS,
  CATALOG_KEY_PATTERN,
  FORBIDDEN_ENTRY_FIELDS,
  RESERVED_RUN_TAGS,
  validateTagPlacement
} from './catalog_validate.script.ts'
import type { CatalogFinding } from './catalog_validate.types.ts'

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
    })

    function tempFeature(name: string, content: string): { root: string; relPath: string } {
      const root = mkdtempSync(path.join(tmpdir(), 'catalog-validate-'))
      tmpRoots.push(root)
      const relPath = `assets/features/${name}`
      mkdirSync(path.join(root, 'assets/features'), { recursive: true })
      writeFileSync(path.join(root, relPath), content)
      return { root, relPath }
    }

    async function checkPlacement(
      fileName: string,
      content: string,
      tag: string
    ): Promise<{ length: number; firstCategory: string | undefined }> {
      const { root, relPath } = tempFeature(fileName, content)
      const findings: CatalogFinding[] = []
      const summary: Record<string, number> = {}
      await validateTagPlacement(findings, summary, relPath, tag, 'test_key', root)
      return { length: findings.length, firstCategory: findings[0]?.category }
    }

    it('accepts tag on Feature line (line 1) in .feature files', async () => {
      const result = await checkPlacement('line1.feature', '@sync @my_test_tag\nFeature: Test\n', 'my_test_tag')
      expect(result.length).toBe(0)
    })

    it('accepts tag on Scenario tag line (not line 1) in .feature files', async () => {
      const result = await checkPlacement(
        'scenario_line.feature',
        '@sync\nFeature: Test\n\n  @unit @my_test_tag\n  Scenario: Something\n    Given a step\n',
        'my_test_tag'
      )
      expect(result.length).toBe(0)
    })

    it('rejects when tag is absent from .feature file', async () => {
      const result = await checkPlacement(
        'absent.feature',
        '@sync\nFeature: Test\n\n  @other_tag\n  Scenario: Something\n    Given a step\n',
        'absent_tag'
      )
      expect(result.length).toBe(1)
      expect(result.firstCategory).toBe('placement')
    })
  })
})
