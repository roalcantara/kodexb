import { describe, expect, it } from 'bun:test'
import {
  ALLOWED_ENTRY_FIELDS,
  CATALOG_KEY_PATTERN,
  FORBIDDEN_ENTRY_FIELDS,
  RESERVED_RUN_TAGS
} from './catalog_validate.script.ts'

describe('catalog_validate.script', () => {
  it('CATALOG_KEY_PATTERN accepts snake_case keys', () => {
    expect(CATALOG_KEY_PATTERN.test('command_palette')).toBe(true)
    expect(CATALOG_KEY_PATTERN.test('CommandPalette')).toBe(false)
  })

  it('RESERVED_RUN_TAGS excludes CI layer tags', () => {
    expect(RESERVED_RUN_TAGS.has('smoke')).toBe(true)
    expect(RESERVED_RUN_TAGS.has('command_palette')).toBe(false)
  })

  it('FORBIDDEN_ENTRY_FIELDS blocks path lists in catalog', () => {
    expect(FORBIDDEN_ENTRY_FIELDS).toContain('features')
    expect(FORBIDDEN_ENTRY_FIELDS).toContain('units')
    expect(ALLOWED_ENTRY_FIELDS.has('title')).toBe(true)
  })
})
