import { type Static, Type } from '@sinclair/typebox'
import type { Simplify } from 'type-fest'
import { type LinkItem, linkItemSchema } from './link.schema'
import { tagsSchema } from './tags.schema'

const nonEmpty = Type.String({ minLength: 1, pattern: '\\S' })

export type { LinkItem }

export const noteBlockSchema = Type.Record(Type.String({ minLength: 1 }), Type.String())
export type NoteBlock = Simplify<Static<typeof noteBlockSchema>>

export const sourceBaseEntryRowObjectSchema = Type.Object({
  key: nonEmpty,
  source: nonEmpty,
  desc: nonEmpty,
  tags: tagsSchema,
  links: Type.Optional(Type.Array(linkItemSchema, { minItems: 1 })),
  notes: Type.Optional(Type.Array(noteBlockSchema, { minItems: 1 })),
  meta: Type.Optional(Type.Record(Type.String(), Type.String()))
})

export type ParsedSourceBaseFields = Simplify<Static<typeof sourceBaseEntryRowObjectSchema>>

export type SourceBaseParseContext = {
  key: string
  source: string
}
