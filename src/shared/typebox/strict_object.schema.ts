import { type ObjectOptions, type TObject, type TProperties, Type } from '@sinclair/typebox'

/**
 * Build a TypeBox object that rejects unknown keys. Replaces the repeated
 * `Type.Object(props, { additionalProperties: false })` tail.
 */
export function strictObject<T extends TProperties>(
  properties: T,
  options: Omit<ObjectOptions, 'additionalProperties'> = {}
): TObject<T> {
  return Type.Object(properties, { ...options, additionalProperties: false })
}
