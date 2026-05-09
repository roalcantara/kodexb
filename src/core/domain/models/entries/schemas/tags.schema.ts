import { type Static, Type } from '@sinclair/typebox'
import type { Simplify } from 'type-fest'
import { PATTERNS } from '../../../constants/entry.const'

const MIN_TAGS = 1
const MAX_TAGS = 4

export const tagsSchema = Type.Array(Type.String({ pattern: PATTERNS.tag.source }), {
  minItems: MIN_TAGS,
  maxItems: MAX_TAGS,
  uniqueItems: true
})

export type Tags = Simplify<Static<typeof tagsSchema>>
