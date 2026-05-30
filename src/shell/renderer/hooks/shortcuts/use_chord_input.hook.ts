import { useMemo } from 'react'

export type InputMode = 'text' | 'chord'

const HAS_CHORD_CHAR = /[+\u2318\u2325\u2303\u21E7]/

function detectMode(raw: string): InputMode {
  const trimmed = raw.trim()
  if (!trimmed) return 'text'
  if (HAS_CHORD_CHAR.test(trimmed)) return 'chord'
  return 'text'
}

export function useChordInput(search: string): { mode: InputMode } {
  return useMemo(() => ({ mode: detectMode(search) }), [search])
}
