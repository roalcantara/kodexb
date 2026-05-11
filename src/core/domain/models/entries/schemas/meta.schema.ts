import type { JsonValue } from 'type-fest'

/**
 * Accepts raw source `meta` object or returns `undefined`.
 */
export function parseMetaFromSource(raw: JsonValue | undefined): Record<string, string> | undefined {
  if (raw !== null && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, string>
  }
}

export const metaFromSourceSchema = {
  parse: (raw: unknown): Record<string, string> | undefined => parseMetaFromSource(raw as JsonValue | undefined)
}
