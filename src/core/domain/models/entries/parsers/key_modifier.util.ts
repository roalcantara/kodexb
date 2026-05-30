// pattern: Functional Core

import {
  DEFAULT_KEY_MODIFIER_PRECEDENCE,
  HYPER_AUTHORING_TOKEN,
  HYPER_TRIPLE_BY_PLATFORM,
  KEY_MODIFIER_INPUT_ALIASES,
  KEY_MODIFIER_PRECEDENCE,
  KEY_MODIFIER_VALUES,
  type KeyModifier
} from '../../../constants/key.const'
import type { AuthoringChordStep, ChordStep, Platform } from '../schemas/shortcut.schema'

export function resolveModifierToken(token: string): KeyModifier | typeof HYPER_AUTHORING_TOKEN | null {
  const lower = token.toLowerCase()
  const alias = KEY_MODIFIER_INPUT_ALIASES[lower]
  if (alias) return alias
  if (lower === HYPER_AUTHORING_TOKEN) return HYPER_AUTHORING_TOKEN
  if ((KEY_MODIFIER_VALUES as readonly string[]).includes(lower)) return lower as KeyModifier
  return null
}

export function sortKeyModifiers(modifiers: KeyModifier[]): KeyModifier[] {
  return [...modifiers].sort(
    (a, b) =>
      (KEY_MODIFIER_PRECEDENCE[a] ?? DEFAULT_KEY_MODIFIER_PRECEDENCE) -
      (KEY_MODIFIER_PRECEDENCE[b] ?? DEFAULT_KEY_MODIFIER_PRECEDENCE)
  )
}

function hyperTripleForPlatform(platform: Platform): readonly KeyModifier[] {
  if (platform === 'any') return HYPER_TRIPLE_BY_PLATFORM.macos
  return HYPER_TRIPLE_BY_PLATFORM[platform]
}

function expandHyperInModifiers(modifiers: readonly string[], platform: Platform): KeyModifier[] {
  const out: KeyModifier[] = []
  let sawHyper = false
  for (const mod of modifiers) {
    if (mod === HYPER_AUTHORING_TOKEN) {
      sawHyper = true
      continue
    }
    if ((KEY_MODIFIER_VALUES as readonly string[]).includes(mod)) out.push(mod as KeyModifier)
  }
  if (sawHyper) {
    for (const m of hyperTripleForPlatform(platform)) {
      if (!out.includes(m)) out.push(m)
    }
  }
  return sortKeyModifiers(out)
}

/** Expand `hyper` into the platform triple; output is storage-safe {@link ChordStep} modifiers. */
export function normalizeChordSteps(steps: AuthoringChordStep[], platform: Platform): ChordStep[] {
  return steps.map(step => ({
    key: step.key,
    ...(step.display === undefined ? {} : { display: step.display }),
    modifiers: expandHyperInModifiers(step.modifiers ?? [], platform)
  }))
}

/** True when modifiers contain the Raycast hyper triple (+ optional shift). */
export function isHyperDisplayChord(modifiers: KeyModifier[], platform: Exclude<Platform, 'any'>): boolean {
  const nonShift = sortKeyModifiers(modifiers.filter(m => m !== 'shift'))
  const expected = sortKeyModifiers([...hyperTripleForPlatform(platform)])
  return nonShift.join('+') === expected.join('+')
}
