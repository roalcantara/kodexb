// pattern: Functional Core

import type { KeyAlias, KeyModifier } from '@core/domain/constants/key.const'
import type { Platform, Scope } from '../schemas/shortcut.schema'
import { type AuthoringChordStep, type ChordStep, type ChordStringSpec, parseChord } from './chord.parser'
import { chordPrefix, hashChord } from './chord_hash.util'

export type BindingRef = {
  bindingId: string
  entryKey: string
  app: string
  scope: Scope
  chordHash: string
  chordPrefix: string | null
  platform: Platform
  action: string
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

type RawEntry = {
  desc?: string
  tags?: string[]
  platform?: string
  bindings?: Array<{
    id?: string
    chord: string | Record<string, string>
    scope: string
    platform?: string
    action: string
    when?: string
    group?: string
    tags?: string[]
  }>
}

type RawBinding = NonNullable<RawEntry['bindings']>[number]

type ParseRawBindingsAccum = {
  refs: BindingRef[]
  errors: string[]
  chords: AuthoringChordStep[][]
}

const makeBindingRef = (
  bindingId: string,
  app: string,
  scope: Scope,
  steps: AuthoringChordStep[],
  platform: BindingRef['platform'],
  action: string
): BindingRef => ({
  bindingId,
  entryKey: app,
  app,
  scope,
  chordHash: hashChord(steps),
  chordPrefix: chordPrefix(steps),
  platform,
  action
})

const appendPlatformChordRefs = (
  accum: ParseRawBindingsAccum,
  app: string,
  rawBinding: RawBinding,
  fullId: string,
  scope: Scope,
  chordByPlatform: Record<string, string>
): void => {
  const platforms = Object.keys(chordByPlatform) as Exclude<Platform, 'any'>[]
  for (const plat of platforms) {
    const platParse = parseChord(chordByPlatform[plat] ?? '')
    if (platParse.isErr()) {
      accum.errors.push(`${app}: binding "${rawBinding.action}" platform ${plat}: ${platParse.error.message}`)
      continue
    }
    accum.refs.push(makeBindingRef(`${fullId}:${plat}`, app, scope, platParse.value, plat, rawBinding.action))
  }
}

const parseOneRawBinding = (accum: ParseRawBindingsAccum, app: string, rawBinding: RawBinding): void => {
  const bindingId = rawBinding.id ?? slugify(rawBinding.action)
  const fullId = `${app}:${bindingId}`
  const scope = rawBinding.scope === 'global' ? ('global' as const) : ('local' as const)
  const platform = (rawBinding.platform ?? 'any') as BindingRef['platform']
  const chordInput: ChordStringSpec =
    typeof rawBinding.chord === 'string' ? rawBinding.chord : (rawBinding.chord as Record<string, string>)

  const parsed = parseChord(chordInput)
  if (parsed.isErr()) {
    accum.errors.push(`${app}: binding "${rawBinding.action}": ${parsed.error.message}`)
    accum.chords.push([])
    return
  }

  accum.chords.push(parsed.value)

  if (typeof rawBinding.chord === 'object' && rawBinding.chord !== null) {
    appendPlatformChordRefs(accum, app, rawBinding, fullId, scope, rawBinding.chord)
    return
  }

  accum.refs.push(makeBindingRef(fullId, app, scope, parsed.value, platform, rawBinding.action))
}

export function parseRawBindings(
  raw: RawEntry,
  app: string
): { refs: BindingRef[]; errors: string[]; chords: AuthoringChordStep[][] } {
  const accum: ParseRawBindingsAccum = { refs: [], errors: [], chords: [] }

  if (!raw.bindings || !Array.isArray(raw.bindings)) {
    return accum
  }

  for (const rawBinding of raw.bindings) {
    parseOneRawBinding(accum, app, rawBinding)
  }

  return accum
}

export function projectEntryBindings(entry: {
  type: string
  key: string
  bindings?: Array<{
    id?: string
    chord: Array<{ modifiers: KeyModifier[]; key: KeyAlias }>
    scope: string
    platform?: string
    action: string
  }>
}): BindingRef[] {
  if (entry.type !== 'shortcut' || !entry.bindings) return []

  const refs: BindingRef[] = []
  for (const b of entry.bindings) {
    const bindingId = b.id ?? slugify(b.action)
    const fullId = `${entry.key}:${bindingId}`
    const hash = hashChord(b.chord as ChordStep[])
    const prefix = chordPrefix(b.chord as ChordStep[])
    refs.push({
      bindingId: fullId,
      entryKey: entry.key,
      app: entry.key,
      scope: b.scope === 'global' ? 'global' : 'local',
      chordHash: hash,
      chordPrefix: prefix,
      platform: (b.platform ?? 'any') as BindingRef['platform'],
      action: b.action
    })
  }
  return refs
}
