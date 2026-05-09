import { type Static, Type } from '@sinclair/typebox'
import type { Simplify } from 'type-fest'

import {
  bookmarkEntrySchema,
  cheatEntrySchema,
  commandEntrySchema,
  taskEntrySchema
} from '../../entries/schemas/entry.schema'

export const persistFieldsSchema = Type.Object({
  id: Type.Integer(),
  createdAt: Type.Number(),
  updatedAt: Type.Number()
})

export type PersistFields = Simplify<Static<typeof persistFieldsSchema>>

export const bookmarkKnowledgeSchema = Type.Composite([bookmarkEntrySchema, persistFieldsSchema])
export const commandKnowledgeSchema = Type.Composite([commandEntrySchema, persistFieldsSchema])
export const cheatKnowledgeSchema = Type.Composite([cheatEntrySchema, persistFieldsSchema])
export const taskKnowledgeSchema = Type.Composite([taskEntrySchema, persistFieldsSchema])

export const knowledgeSchema = Type.Union([
  bookmarkKnowledgeSchema,
  commandKnowledgeSchema,
  cheatKnowledgeSchema,
  taskKnowledgeSchema
])

export type BookmarkKnowledge = Simplify<Static<typeof bookmarkKnowledgeSchema>>
export type CommandKnowledge = Simplify<Static<typeof commandKnowledgeSchema>>
export type CheatKnowledge = Simplify<Static<typeof cheatKnowledgeSchema>>
export type TaskKnowledge = Simplify<Static<typeof taskKnowledgeSchema>>
export type Knowledge = Simplify<Static<typeof knowledgeSchema>>
