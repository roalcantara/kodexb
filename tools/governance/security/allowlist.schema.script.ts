import { type Static, Type } from '@sinclair/typebox'
import { Value } from '@sinclair/typebox/value'

export const HandoffAllowlistSchema = Type.Object({
  entries: Type.Array(Type.String())
})

export type HandoffAllowlist = Static<typeof HandoffAllowlistSchema>

const NON_LITERAL = /[*?[\\]^$]/

export function validateAllowlistShape(input: unknown): HandoffAllowlist {
  if (!input || typeof input !== 'object') throw new Error('allowlist must be an object')
  if (!Value.Check(HandoffAllowlistSchema, input)) {
    const errors = [...Value.Errors(HandoffAllowlistSchema, input)]
    throw new Error(`allowlist schema validation failed: ${errors.map(e => e.message).join(', ')}`)
  }

  const entries = input.entries.map(item => {
    const trimmed = item.trim()
    if (!trimmed) throw new Error('allowlist entry must be non-empty')
    if (NON_LITERAL.test(trimmed)) throw new Error('allowlist entry must be literal (no glob/regex tokens)')
    return trimmed
  })

  return { entries }
}
