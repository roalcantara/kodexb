import type { Binding, ChordStep } from '../../entries/schemas/shortcut.schema'
import type { ShortcutKnowledge } from '../schemas/knowledge.schema'

function chordStepToText(step: ChordStep): string {
  const mods = step.modifiers ?? []
  return [...mods, step.key].filter(Boolean).join('+')
}

function chordToText(chord: ChordStep[]): string {
  return chord.map(chordStepToText).join(' ')
}

function bindingLine(b: Binding): string {
  return `- ${chordToText(b.chord)} — ${b.action}`
}

/**
 * Preamble for a shortcut entry:
 *   ### BINDINGS
 *
 *   - <chord> — <action>
 *   - ...
 *
 * The plain chord + action text is what gets indexed by FTS5, so the
 * main search can find a keymap by typing any binding's action.
 */
export const buildShortcutPreamble = (entry: ShortcutKnowledge): string => {
  if (!entry.bindings || entry.bindings.length === 0) return ''
  const lines = entry.bindings.map(bindingLine)
  return `### BINDINGS\n\n${lines.join('\n')}`
}
