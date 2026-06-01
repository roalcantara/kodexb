import { expect } from 'bun:test'

export type ValidationErrorPayload = {
  type: 'validation'
  on: string
  property: string
  message: string
}

export type BodyValidationErrorExpectation = {
  /** Field path with or without a leading slash (Elysia uses `/entryId`). */
  property: string
  message: string
  on?: 'body' | 'query' | 'params' | 'headers' | 'cookie' | 'response'
}

export function normalizeValidationProperty(property: string): string {
  return property.startsWith('/') ? property : `/${property}`
}

/** Parse Elysia validation errors from `{ error: string }` RPC 500 envelopes. */
export function parseValidationErrorEnvelope(body: { error: unknown }): ValidationErrorPayload | null {
  const { error } = body
  if (typeof error === 'string') {
    try {
      const parsed: unknown = JSON.parse(error)
      if (parsed && typeof parsed === 'object' && (parsed as ValidationErrorPayload).type === 'validation') {
        return parsed as ValidationErrorPayload
      }
    } catch {
      return null
    }
  }
  if (typeof error === 'object' && error !== null && (error as ValidationErrorPayload).type === 'validation') {
    return error as ValidationErrorPayload
  }
  return null
}

export function expectBodyValidationError(body: unknown, spec: BodyValidationErrorExpectation): void {
  expect(body && typeof body === 'object').toBe(true)
  const { error } = body as { error: unknown }
  expect(typeof error).toBe('string')
  const parsed = parseValidationErrorEnvelope({ error })
  expect(parsed).not.toBeNull()
  expect(parsed).toMatchObject({
    type: 'validation',
    on: spec.on ?? 'body',
    property: normalizeValidationProperty(spec.property),
    message: spec.message
  })
}
