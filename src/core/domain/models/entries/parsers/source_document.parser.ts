import type { JsonValue, UnknownRecord } from 'type-fest'
import { SECTION_ENTRY_TYPES } from '../../../constants/entry.const'
import type { EntryType } from '../../../types/entry.types'
import { toEntryWithSourceHint } from '../factories/entry.factory'
import type { Entry, SourceRow } from '../schemas/entry.schema'

export function parseSourceSection(section: string, sectionValue: unknown, filePath: string, content: string): Entry[] {
  const type = (SECTION_ENTRY_TYPES as Record<string, EntryType | undefined>)[section]
  if (!type) return []
  if (sectionValue === null || typeof sectionValue !== 'object' || Array.isArray(sectionValue)) return []

  const result: Entry[] = []
  for (const [key, rawValue] of Object.entries(sectionValue as UnknownRecord)) {
    if (rawValue === null || typeof rawValue !== 'object' || Array.isArray(rawValue)) continue
    result.push(toEntryWithSourceHint(type, rawValue as SourceRow, key, filePath, section, content))
  }
  return result
}

/**
 * Parses a source file body (YAML text) into validated {@link Entry} values.
 *
 * @param filePath Absolute path stored as `source` on each entry.
 * @param content Raw serialized document text.
 */
export function parseSourceFile(filePath: string, content: string): Entry[] {
  const parsed = Bun.YAML.parse(content)
  if (!parsed || typeof parsed !== 'object') return []

  return Object.entries(parsed).flatMap(([section, value]) =>
    parseSourceSection(section, value as JsonValue, filePath, content)
  )
}
