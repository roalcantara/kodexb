// pattern: Functional Core

import { type Static, Type } from '@sinclair/typebox'
import type { Simplify } from 'type-fest'
import {
  HYPER_AUTHORING_TOKEN,
  KEY_ALIAS_VALUES,
  KEY_MODIFIER_VALUES,
  type KeyAlias
} from '../../../constants/key.const'
import { noteBlockSchema, sourceBaseEntryRowObjectSchema } from './base.schema'
import { linkItemSchema } from './link.schema'
import { tagsSchema } from './tags.schema'

const nonEmpty = Type.String({ minLength: 1, pattern: '\\S' })

/** Stored binding modifiers (post-normalize). */
export const modifierSchema = Type.Union(KEY_MODIFIER_VALUES.map(value => Type.Literal(value)))

/** YAML / parser tokens before hyper expansion. */
export const authoringModifierSchema = Type.Union([modifierSchema, Type.Literal(HYPER_AUTHORING_TOKEN)])

/** Canonical chord key token (see {@link KEY_ALIAS_VALUES} / {@link KEY_GLYPHS} in `key.const.ts`). */
export const keyAliasSchema = Type.Union(KEY_ALIAS_VALUES.map(value => Type.Literal(value)))

export const authoringChordStepSchema = Type.Object({
  modifiers: Type.Optional(Type.Array(authoringModifierSchema, { uniqueItems: true })),
  key: keyAliasSchema,
  display: Type.Optional(Type.String())
})

/** Persisted chord steps (bindings after {@link normalizeChordSteps}). */
export const chordStepSchema = Type.Object({
  modifiers: Type.Optional(Type.Array(modifierSchema, { uniqueItems: true })),
  key: keyAliasSchema,
  display: Type.Optional(Type.String())
})

export const platformSchema = Type.Union([
  Type.Literal('macos'),
  Type.Literal('linux'),
  Type.Literal('windows'),
  Type.Literal('any')
])

export const scopeSchema = Type.Union([Type.Literal('global'), Type.Literal('local')])

export const bindingSchema = Type.Object({
  id: Type.Optional(nonEmpty),
  chord: Type.Array(chordStepSchema, { minItems: 1 }),
  scope: scopeSchema,
  platform: Type.Optional(platformSchema),
  action: nonEmpty,
  when: Type.Optional(nonEmpty),
  group: Type.Optional(nonEmpty),
  intent: Type.Optional(nonEmpty),
  tags: Type.Optional(tagsSchema),
  links: Type.Optional(Type.Array(linkItemSchema, { minItems: 1 })),
  notes: Type.Optional(Type.Array(noteBlockSchema, { minItems: 1 }))
})

export const shortcutEntrySchema = Type.Composite([
  sourceBaseEntryRowObjectSchema,
  Type.Object({
    type: Type.Literal('shortcut'),
    platform: Type.Optional(platformSchema),
    bindings: Type.Array(bindingSchema, { minItems: 1 })
  })
])

export type Modifier = Static<typeof modifierSchema>
export type { KeyAlias }
export type AuthoringModifier = Static<typeof authoringModifierSchema>
export type AuthoringChordStep = Simplify<Static<typeof authoringChordStepSchema>>
export type ChordStep = Simplify<Static<typeof chordStepSchema>>
export type Platform = Static<typeof platformSchema>
export type Scope = Static<typeof scopeSchema>
export type Binding = Simplify<Static<typeof bindingSchema>>
export type ShortcutEntry = Simplify<Static<typeof shortcutEntrySchema>>
