import { type Static, Type } from '@sinclair/typebox'
import type { Simplify } from 'type-fest'

export const httpUrlSchema = Type.String({ pattern: '^https?://\\S+$' })
export const linkMapValueSchema = Type.Union([httpUrlSchema, Type.Array(httpUrlSchema, { minItems: 1 })])
export const linkObjectSchema = Type.Record(Type.String({ minLength: 1 }), linkMapValueSchema, { minProperties: 1 })
export const linkItemSchema = Type.Union([httpUrlSchema, linkObjectSchema])

export type LinkItem = Simplify<Static<typeof linkItemSchema>>
