import type { JsonValue } from 'type-fest'
import { parse } from '../../../../validation'
import type { BaseEntry, EntryType, SourceRow } from '../../../types'
import { sourceBaseEntryRowObjectSchema } from '../schemas/base.schema'
import { parseLinksFromSource } from './link.parser'
import { parseMetaFromSource } from './meta.parser'
import { parseNoteBlocksFromSource } from './notes.parser'
import { parseTagsFromSource } from './tags.parser'

/**
 * Parses shared source fields plus file context into a {@link BaseEntry} shape.
 */
export const parseBaseEntryFields = (raw: SourceRow, type: EntryType, key: string, source: string): BaseEntry => {
  const desc = typeof raw.desc === 'string' ? raw.desc : ''
  const tags = parseTagsFromSource(raw.tags as JsonValue | undefined)
  const links = parseLinksFromSource(raw.links as JsonValue | undefined)
  const notes = parseNoteBlocksFromSource(raw.notes as JsonValue | undefined)
  const meta = parseMetaFromSource(raw.meta as JsonValue | undefined)

  const parsed = parse(sourceBaseEntryRowObjectSchema, {
    key,
    source,
    desc,
    tags,
    ...(links ? { links } : {}),
    ...(notes.length > 0 ? { notes } : {}),
    ...(meta ? { meta } : {})
  })

  return {
    type,
    ...parsed
  }
}
