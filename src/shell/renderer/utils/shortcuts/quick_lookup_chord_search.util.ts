// pattern: Functional Core

import type { AuthoringChordStep } from '@core/domain/models/entries/parsers/chord.parser'
import { parseChord } from '@core/domain/models/entries/parsers/chord.parser'
import { hashChord } from '@core/domain/models/entries/parsers/chord_hash.util'

export function computeChordHash(chord: AuthoringChordStep[]): string {
  return hashChord(chord)
}

export function parseChordFromSearch(search: string): AuthoringChordStep[] | null {
  const result = parseChord(search.trim())
  return result.isOk() ? result.value : null
}

export function fuzzyScore(action: string, q: string): number {
  const lower = action.toLowerCase()
  const idx = lower.indexOf(q)
  if (idx === -1) return 0
  return idx === 0 ? 2 : 1
}
