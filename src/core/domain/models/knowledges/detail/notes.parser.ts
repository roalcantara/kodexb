import type { NoteFragment, RawNotes } from '../../../types/note_fragments.types'

/**
 * Normalises the source `notes` field into a flat list of NoteFragment.
 * Pure function — no I/O.
 */
export const parseNotes = (raw: RawNotes | null | undefined): NoteFragment[] => {
  if (raw == null) return []

  if (typeof raw === 'string') {
    return [{ format: 'md', payload: raw }]
  }

  if (!Array.isArray(raw)) {
    return parseNotesFromBlocks([raw])
  }

  return parseNotesFromBlocks(raw)
}

function parseNotesFromBlocks(blocks: Record<string, string>[]): NoteFragment[] {
  const result: NoteFragment[] = []

  for (const item of blocks) {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) continue

    const keys = Object.keys(item)
    if (keys.length === 0) continue

    const format = keys[0] as string
    const payload = item[format]
    if (typeof payload === 'string') {
      result.push({ format, payload })
    }
  }

  return result
}
