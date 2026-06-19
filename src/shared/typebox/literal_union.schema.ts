import { type TLiteral, type TUnion, Type } from '@sinclair/typebox'

type LiteralMembers<T extends readonly (string | number | boolean)[]> = {
  -readonly [K in keyof T]: TLiteral<T[K]>
}

/**
 * Build a TypeBox union of literal members from an `as const` tuple, preserving
 * the exact literal types (no widening to `string`/`number`). Replaces the
 * hand-rolled `Type.Union([Type.Literal(a), Type.Literal(b), ...])` pattern.
 */
export function literalUnion<const T extends readonly (string | number | boolean)[]>(
  values: T
): TUnion<LiteralMembers<T>> {
  return Type.Union(values.map(value => Type.Literal(value))) as TUnion<LiteralMembers<T>>
}
