import { crc32 } from '../../../../../shared/utils'
import { parse } from '../../../../validation'
import type { EntryType } from '../../../types/entry.types'
import type { Entry } from '../../entries/schemas/entry.schema'
import { assembleDoc } from '../detail/doc.assembler'
import { type Knowledge, knowledgeSchema } from '../schemas/knowledge.schema'

/**
 * Derives a stable numeric id from an entry type and source key.
 * `crc32(type + ":" + key)` — deterministic across rebuilds.
 */
export const deriveId = (type: EntryType, key: string): number => crc32(`${type}:${key}`)

/**
 * Adds persistence fields to an {@link Entry} (import / upsert shape).
 */
export function toKnowledge(entry: Entry, now: number): Knowledge {
  const knowledge = parse(knowledgeSchema, {
    ...entry,
    id: deriveId(entry.type, entry.key),
    doc: '',
    createdAt: now,
    updatedAt: now
  })
  knowledge.doc = assembleDoc(knowledge, { now: new Date(now) }).unwrapOr('')
  return knowledge
}
