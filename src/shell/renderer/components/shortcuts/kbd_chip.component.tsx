import {
  GLYPH_MAP_LINUX,
  GLYPH_MAP_MACOS,
  HYPER_GLYPH,
  type KeyAlias,
  type KeyModifier,
  keyGlyphFor,
  ORDERED_MODIFIERS
} from '@core/domain/constants/key.const'
import { isHyperDisplayChord } from '@core/domain/models/entries/parsers/key_modifier.util'
import type { ChordStep, Platform } from '@core/domain/models/entries/schemas/shortcut.schema'
import type { ReactNode } from 'react'
import { memo } from 'react'

function glyphFor(modifier: KeyModifier, platform: Exclude<Platform, 'any'>): string {
  if (platform === 'linux') return GLYPH_MAP_LINUX[modifier] ?? modifier
  return GLYPH_MAP_MACOS[modifier] ?? modifier
}

function keyDisplay(key: KeyAlias, platform: Exclude<Platform, 'any'>): string {
  if (platform === 'linux') return key
  return keyGlyphFor(key)
}

function sortedModifiers(modifiers: KeyModifier[] | undefined): KeyModifier[] {
  return ORDERED_MODIFIERS.filter(m => (modifiers ?? []).includes(m))
}

function hyperModifiers(modifiers: KeyModifier[] | undefined): KeyModifier[] {
  return (modifiers ?? []).filter(m => m !== 'shift') as KeyModifier[]
}

function renderModifiers(modifiers: KeyModifier[] | undefined, platform: Exclude<Platform, 'any'>): ReactNode[] {
  const sorted = sortedModifiers(modifiers)
  const shiftOnly = sorted.length === 1 && sorted[0] === 'shift'
  const plat = platform === 'linux' ? 'linux' : 'macos'
  if (!shiftOnly && isHyperDisplayChord(hyperModifiers(modifiers), plat)) {
    const nodes: ReactNode[] = [
      <kbd key="hyper" className="cmp-kbd-chip__modifier" aria-label="hyper">
        {HYPER_GLYPH}
      </kbd>
    ]
    if (sorted.includes('shift')) {
      nodes.push(
        <kbd key="shift" className="cmp-kbd-chip__modifier" aria-label="shift">
          {glyphFor('shift', platform)}
        </kbd>
      )
    }
    return nodes
  }
  return sorted.map(mod => (
    <kbd key={mod} className="cmp-kbd-chip__modifier" aria-label={mod}>
      {glyphFor(mod, platform)}
    </kbd>
  ))
}

export type KbdChipProps = {
  chord: ChordStep[]
  platform?: Exclude<Platform, 'any'>
}

function KbdChipComponent({ chord, platform = 'macos' }: KbdChipProps) {
  if (chord.length === 0) return null

  const displayPlatform = platform === 'linux' ? 'linux' : 'macos'

  return (
    <span className="cmp-kbd-chip">
      {chord.map((step, stepIdx) => {
        const stepKey = `${step.key}-${(step.modifiers ?? []).join('+')}-${stepIdx}`
        return (
          <span key={stepKey} className="cmp-kbd-chip__step">
            {renderModifiers(step.modifiers, displayPlatform)}
            <kbd className="cmp-kbd-chip__key" aria-label={step.key}>
              {step.display ?? keyDisplay(step.key, displayPlatform)}
            </kbd>
            {stepIdx < chord.length - 1 && (
              <span className="cmp-kbd-chip__spacer" aria-hidden>
                &nbsp;
              </span>
            )}
          </span>
        )
      })}
    </span>
  )
}

export const KbdChip = memo(
  KbdChipComponent,
  (prev, next) =>
    prev.chord === next.chord &&
    prev.platform === next.platform &&
    prev.chord.length === next.chord.length &&
    prev.chord.every((step, i) => {
      const nextStep = next.chord[i]
      if (!nextStep) return false
      const prevMods = step.modifiers ?? []
      const nextMods = nextStep.modifiers ?? []
      return (
        step.key === nextStep.key &&
        step.display === nextStep.display &&
        prevMods.length === nextMods.length &&
        prevMods.every(m => nextMods.includes(m))
      )
    })
)
