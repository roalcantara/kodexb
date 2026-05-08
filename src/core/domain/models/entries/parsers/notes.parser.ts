import type { JsonValue } from 'type-fest'
import { TypeBoxValidationError } from '../../../../validation/typebox.helper'
import { isNoteLang } from '../../../guards'
import type { NoteBlock } from '../schemas/base.schema'

const makeError = (path: string, message: string, value: unknown): TypeBoxValidationError =>
  new TypeBoxValidationError([
    {
      path,
      message,
      schema: {},
      value,
      type: 0
    } as never
  ])

export function parseNoteBlock(raw: unknown): NoteBlock {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw makeError('/', 'Each note must be a non-empty object', raw)
  }

  const keys = Object.keys(raw as object)
  if (keys.length === 0) {
    throw makeError('/', 'Each note must be a non-empty object', raw)
  }

  const rawKey = keys[0] ?? ''
  const lang = rawKey.split('#')[0]?.trim() ?? rawKey

  if (!isNoteLang(lang)) {
    throw makeError(`/${rawKey}`, `Unsupported note block language: ${lang}`, raw)
  }

  return raw as NoteBlock
}

export function parseNoteBlocksFromSource(raw: JsonValue | undefined): NoteBlock[] {
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    return trimmed.length > 0 ? [{ md: trimmed }] : []
  }

  if (!raw) {
    return []
  }

  if (!Array.isArray(raw) && typeof raw === 'object') {
    return [parseNoteBlock(raw)]
  }

  if (!Array.isArray(raw)) {
    return []
  }

  const blocks: NoteBlock[] = []
  for (const item of raw) {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) continue

    try {
      const block = parseNoteBlock(item)
      blocks.push(block)
    } catch {
      // Intentionally ignore invalid note rows in lenient source parsing mode.
    }
  }

  return blocks
}
