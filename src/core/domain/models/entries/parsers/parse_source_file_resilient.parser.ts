import type { UnknownRecord } from 'type-fest'
import { SECTION_ENTRY_TYPES } from '../../../constants/entry.const'
import type { EntryType } from '../../../types/entry.types'
import { toEntryWithSourceHint } from '../factories/entry.factory'
import type { Entry, SourceRow } from '../schemas/entry.schema'

export type SourceParseResult = {
  entries: Entry[]
  errors: string[]
}

function formatEntryError(filePath: string, key: string, msg: string): string {
  return `${filePath}: entry "${key}": ${msg}`
}

function parseSectionEntries(
  section: string,
  sectionValue: unknown,
  filePath: string,
  content: string
): { entries: Entry[]; errors: string[] } {
  const type = (SECTION_ENTRY_TYPES as Record<string, EntryType | undefined>)[section]
  if (!type) return { entries: [], errors: [] }
  if (sectionValue === null || typeof sectionValue !== 'object' || Array.isArray(sectionValue)) {
    return { entries: [], errors: [] }
  }

  const entries: Entry[] = []
  const errors: string[] = []

  for (const [key, rawValue] of Object.entries(sectionValue as UnknownRecord)) {
    if (rawValue === null || typeof rawValue !== 'object' || Array.isArray(rawValue)) continue

    const entryResult = tryParseEntry(type, key, rawValue as SourceRow, filePath, section, content)
    if (entryResult.entry) {
      entries.push(entryResult.entry)
    } else if (entryResult.error) {
      errors.push(entryResult.error)
    }
  }

  return { entries, errors }
}

function tryParseEntry(
  type: EntryType,
  key: string,
  rawValue: SourceRow,
  filePath: string,
  section: string,
  content: string
): { entry: Entry | null; error: string | null } {
  try {
    const entry = toEntryWithSourceHint(type, rawValue, key, filePath, section, content)
    return { entry, error: null }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { entry: null, error: formatEntryError(filePath, key, msg) }
  }
}

/**
 * Parses a source file body (YAML text) into validated {@link Entry} values.
 * Entry-level errors are collected and returned alongside successful entries,
 * enabling partial file imports rather than fail-fast on first error.
 *
 * @param filePath Absolute path stored as `source` on each entry.
 * @param content Raw serialized document text.
 */
export function parseSourceFileResilient(filePath: string, content: string): SourceParseResult {
  let parsed: unknown
  try {
    parsed = Bun.YAML.parse(content)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { entries: [], errors: [`${filePath}: ${msg}`] }
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { entries: [], errors: [`${filePath}: document is not a valid YAML object`] }
  }

  const entries: Entry[] = []
  const errors: string[] = []

  for (const [section, sectionValue] of Object.entries(parsed as UnknownRecord)) {
    const sectionResult = parseSectionEntries(section, sectionValue, filePath, content)
    entries.push(...sectionResult.entries)
    errors.push(...sectionResult.errors)
  }

  return { entries, errors }
}
