import { type Static, Type } from '@sinclair/typebox'
import { TypeCompiler } from '@sinclair/typebox/compiler'
import type { Simplify, UnknownRecord } from 'type-fest'
import { tagsSchema } from './tags.schema'

export const sourceRowMinSchema = Type.Object({
  desc: Type.String({ minLength: 1, pattern: '\\S' }),
  tags: tagsSchema
})

export type SourceRowMin = Simplify<Static<typeof sourceRowMinSchema>>

const sourceRowMinChecker = TypeCompiler.Compile(sourceRowMinSchema)

export function isValidSourceRowMin(raw: unknown): raw is UnknownRecord {
  return sourceRowMinChecker.Check(raw)
}
