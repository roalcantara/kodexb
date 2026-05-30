import type { UnknownRecord } from 'type-fest'
import { formatErrors, parse, TypeBoxValidationError } from '../../../../validation'

import type { EntryType } from '../../../types/entry.types'
import { approxEntryKeyLine } from '../../sources/parsers/source_location.parser'
import { parseBaseEntryFields } from '../parsers/base_fields.parser'
import { parseChord } from '../parsers/chord.parser'
import { normalizeChordSteps } from '../parsers/key_modifier.util'
import { type Entry, entrySchema, type SourceRow } from '../schemas/entry.schema'
import type { Platform } from '../schemas/shortcut.schema'
import {
  parseTaskDependsOnFromSource,
  parseTaskDueDateFromSource,
  parseTaskOrderFromSource,
  parseTaskPriorityFromSource,
  parseTaskStatusFromSource
} from '../schemas/task.schema'

function parseShortcutBindings(rawRecord: UnknownRecord): UnknownRecord[] {
  const rawBindings = rawRecord.bindings
  const entryPlatform = (rawRecord.platform ? String(rawRecord.platform) : 'any') as Platform
  if (!Array.isArray(rawBindings)) return []
  return rawBindings
    .map((b: UnknownRecord) => {
      const chordRaw = String(b.chord ?? '')
      const parsed = parseChord(chordRaw)
      const bindingPlatform = (b.platform ? String(b.platform) : entryPlatform) as Platform
      return {
        ...b,
        chord: parsed.isOk() ? normalizeChordSteps(parsed.value, bindingPlatform) : []
      }
    })
    .filter(b => b.chord.length > 0)
}

/**
 * Validates and narrows one source map row into an {@link Entry}.
 */
export function toEntry(type: EntryType, raw: SourceRow, key: string, source: string): Entry {
  const base = parseBaseEntryFields(raw, type, key, source)
  if (type === 'task') {
    const priority = parseTaskPriorityFromSource(raw.priority)
    const status = parseTaskStatusFromSource(raw.status)
    const dueDate = parseTaskDueDateFromSource(raw.due ?? raw.due_date)
    const taskOrder = parseTaskOrderFromSource(raw.task_order)
    const dependsOn = parseTaskDependsOnFromSource(raw.depends_on)
    return parse(entrySchema, {
      ...base,
      type: 'task',
      ...(priority ? { priority } : {}),
      status,
      ...(dueDate === undefined ? {} : { dueDate }),
      ...(taskOrder === undefined ? {} : { taskOrder }),
      ...(dependsOn === undefined ? {} : { dependsOn })
    })
  }
  if (type === 'shortcut') {
    const rawRecord = raw as UnknownRecord
    const rawPlatform = rawRecord.platform
    const bindings = parseShortcutBindings(rawRecord)
    return parse(entrySchema, {
      ...base,
      type: 'shortcut',
      ...(rawPlatform ? { platform: String(rawPlatform) } : {}),
      bindings
    })
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
