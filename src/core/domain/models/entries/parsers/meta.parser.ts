import type { JsonValue } from 'type-fest'

export function parseMetaFromSource(raw: JsonValue | undefined): Record<string, string> | undefined {
  if (raw !== null && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, string>
  }
}
