import { formatErrors, parse, TypeBoxValidationError } from '../../../../validation'

import type { EntryType } from '../../../types/entry.types'
import { approxEntryKeyLine } from '../../sources/parsers/source_location.parser'
import { parseBaseEntryFields } from '../parsers/base_fields.parser'
import { type Entry, entrySchema, type SourceRow } from '../schemas/entry.schema'
import { parseTaskPriorityFromSource, parseTaskStatusFromSource } from '../schemas/task.schema'

/**
 * Validates and narrows one source map row into an {@link Entry}.
 */
export function toEntry(type: EntryType, raw: SourceRow, key: string, source: string): Entry {
  const base = parseBaseEntryFields(raw, type, key, source)
  if (type === 'task') {
    const priority = parseTaskPriorityFromSource(raw.priority)
    const status = parseTaskStatusFromSource(raw.status)
    return parse(entrySchema, { ...base, type: 'task', ...(priority ? { priority } : {}), status })
  }
  return parse(entrySchema, { ...base, type })
}

/**
 * Like {@link toEntry}, but rethrows validation errors with `filePath:line` when parse fails.
 */
export function toEntryWithSourceHint(
  type: EntryType,
  raw: SourceRow,
  key: string,
  filePath: string,
  section: string,
  content: string
): Entry {
  try {
    return toEntry(type, raw, key, filePath)
  } catch (err) {
    if (err instanceof TypeBoxValidationError) {
      const line = approxEntryKeyLine(content, section, key)
      const loc = line ? `${filePath}:${line}` : filePath
      throw new Error(`${loc}: entry "${key}": ${formatErrors(err.errors)}`, { cause: err })
    }
    throw err
  }
}
