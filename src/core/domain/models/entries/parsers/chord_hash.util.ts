// pattern: Functional Core

import { HYPER_AUTHORING_TOKEN, isKeyModifier, type KeyModifier } from '../../../constants/key.const'
import type { AuthoringChordStep } from '../schemas/shortcut.schema'
import { sortKeyModifiers } from './key_modifier.util'

function storedModifiers(step: AuthoringChordStep): KeyModifier[] {
  return sortKeyModifiers(
    (step.modifiers ?? []).filter((m): m is KeyModifier => m !== HYPER_AUTHORING_TOKEN && isKeyModifier(m))
  )
}

function stepHash(step: AuthoringChordStep): string {
  const mods = storedModifiers(step)
  return mods.length === 0 ? step.key : `${mods.join('+')}+${step.key}`
}

/** Hash canonical modifiers only (`hyper` is omitted until normalized). */
export function hashChord(chord: readonly AuthoringChordStep[]): string {
  return chord.map(stepHash).join('>')
}

export function chordPrefix(chord: readonly AuthoringChordStep[]): string | null {
  if (chord.length <= 1) return null
  return chord.slice(0, -1).map(stepHash).join('>')
}
