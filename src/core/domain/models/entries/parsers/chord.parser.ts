// pattern: Functional Core
import { isBlank } from '@core/domain/guards'
import { err, ok, type Result } from 'neverthrow'
import {
  DEFAULT_KEY_MODIFIER_PRECEDENCE,
  isChordKeyToken,
  KEY_MODIFIER_AUTHORING_PRECEDENCE,
  type KeyAlias,
  MODIFIER_GLYPH_PATTERN,
  resolveChordKeyToken
} from '../../../constants/key.const'
import type { AuthoringChordStep, AuthoringModifier } from '../schemas/shortcut.schema'
import { resolveModifierToken } from './key_modifier.util'

const SPACE_REGEX = /\s+/

export type ChordStringSpec = string | { macos?: string; linux?: string; windows?: string }
export type ParseError = { message: string; input: string }

export type { AuthoringChordStep, AuthoringModifier, ChordStep } from '../schemas/shortcut.schema'

function resolveKey(word: string): KeyAlias | null {
  if (isChordKeyToken(word)) return resolveChordKeyToken(word)
  if (word.length === 1) {
    const lower = word.toLowerCase()
    if (isChordKeyToken(lower)) return resolveChordKeyToken(lower)
  }
  return null
}

const precedenceCompare = (a: string, b: string) =>
  (KEY_MODIFIER_AUTHORING_PRECEDENCE[a] ?? DEFAULT_KEY_MODIFIER_PRECEDENCE) -
  (KEY_MODIFIER_AUTHORING_PRECEDENCE[b] ?? DEFAULT_KEY_MODIFIER_PRECEDENCE)

function sortAuthoringModifiers(modifiers: AuthoringModifier[]): AuthoringModifier[] {
  return [...modifiers].sort(precedenceCompare)
}

function rejectModifierGlyphs(input: string): Result<void, ParseError> {
  if (MODIFIER_GLYPH_PATTERN.test(input)) {
    return err({
      message:
        'Modifier glyphs (⌘ ⌥ ⌃ ⇧) are not allowed; author chords with cmd / ctrl / alt / opt / shift / super / windows / hyper',
      input
    })
  }
  return ok(undefined)
}

function parsePlusStep(part: string, input: string): Result<AuthoringChordStep, ParseError> {
  const tokens = part.split('+').filter(Boolean)
  const modifiers: AuthoringModifier[] = []
  let key: KeyAlias | null = null

  for (const token of tokens) {
    if (key !== null) {
      return err({ message: `Unexpected token "${token}" after key in "${part}"`, input })
    }

    const mod = resolveModifierToken(token)
    if (mod !== null) {
      if (!modifiers.includes(mod)) modifiers.push(mod)
      continue
    }

    const resolvedKey = resolveKey(token)
    if (resolvedKey) {
      key = resolvedKey
      continue
    }

    return err({ message: `Unknown modifier or key "${token}" in "${part}"`, input })
  }

  if (!key) return err({ message: `No key found in step "${part}"`, input })
  return ok({ modifiers: sortAuthoringModifiers(modifiers), key })
}

function parseBareKeyStep(part: string, input: string): Result<AuthoringChordStep, ParseError> {
  const key = resolveKey(part)
  if (!key) return err({ message: `Unknown key "${part}"`, input })
  return ok({ modifiers: [], key })
}

function parseSpacePart(part: string, input: string): Result<AuthoringChordStep, ParseError> {
  if (part.includes('+')) return parsePlusStep(part, input)
  return parseBareKeyStep(part, input)
}

const parseChordString = (input: string): Result<AuthoringChordStep[], ParseError> => {
  const trimmed = input.trim()
  if (!trimmed) return err({ message: 'Empty chord string', input })

  const glyphCheck = rejectModifierGlyphs(trimmed)
  if (glyphCheck.isErr()) return err(glyphCheck.error)

  const steps: AuthoringChordStep[] = []
  for (const part of trimmed.split(SPACE_REGEX)) {
    if (isBlank(part)) continue
    const parsed = parseSpacePart(part as string, input)
    if (parsed.isErr()) return err(parsed.error)
    steps.push(parsed.value)
  }

  return ok(steps)
}

export function parseChord(input: ChordStringSpec): Result<AuthoringChordStep[], ParseError> {
  if (typeof input === 'string') {
    return parseChordString(input)
  }
  const platforms = ['macos', 'linux', 'windows'] as const
  for (const plat of platforms) {
    if (input[plat] !== undefined) {
      return parseChordString(input[plat])
    }
  }
  return err({ message: 'No platform-specific chord string found', input: JSON.stringify(input) })
}
