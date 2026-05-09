import type { JsonValue } from 'type-fest'
import { safeParse, TypeBoxValidationError } from '../../../../validation/typebox.helper'
import type { LinkItem } from '../schemas/link.schema'
import { linkItemSchema } from '../schemas/link.schema'

const TITLED_LINK_RE = /^(.+?):\s*(https?:\/\/\S+)\s*$/

const makeError = (path: string, message: string, value: unknown): TypeBoxValidationError =>
  new TypeBoxValidationError([
    {
      path,
      message,
      schema: {},
      value,
      type: 0
    } as never
  ])

function parseTitledLink(raw: string): Record<string, string> {
  const match = raw.trim().match(TITLED_LINK_RE)
  if (!match) {
    throw makeError('/links', 'Expected bare URL or "Title: https://..."', raw)
  }

  const title = match[1]?.trim() ?? ''
  const url = match[2]?.trim() ?? ''
  const parsed = safeParse(linkItemSchema, { [title]: url })
  if (!parsed.ok) {
    throw makeError('/links', 'Invalid URL in titled link', raw)
  }
  return parsed.data as Record<string, string>
}

function parseSingleLinkItem(raw: unknown): LinkItem {
  if (typeof raw !== 'string' && (raw === null || typeof raw !== 'object' || Array.isArray(raw))) {
    throw makeError('/links', 'Invalid links value', raw)
  }

  if (typeof raw === 'string') {
    const direct = safeParse(linkItemSchema, raw.trim())
    if (direct.ok) {
      return direct.data
    }

    if (raw.includes(': http://') || raw.includes(': https://')) {
      return parseTitledLink(raw)
    }

    throw makeError('/links', 'Invalid URL', raw)
  }

  const parsed = safeParse(linkItemSchema, raw)
  if (!parsed.ok) {
    throw makeError('/links', 'Link object must have at least one key', raw)
  }
  return parsed.data
}

function normaliseArrayItem(item: unknown): unknown[] {
  if (typeof item === 'string') return [item]
  if (Array.isArray(item)) return item.filter((value): value is string => typeof value === 'string')
  if (item !== null && typeof item === 'object') return [item as Record<string, unknown>]
  return []
}

export function parseLinksFromSource(raw: JsonValue | undefined): LinkItem[] | undefined {
  if (!raw) {
    return
  }

  if (typeof raw === 'string') {
    return [parseSingleLinkItem(raw)]
  }

  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return [parseSingleLinkItem(raw)]
  }

  if (!Array.isArray(raw)) {
    return
  }

  const normalised = raw.flatMap(normaliseArrayItem)
  if (normalised.length === 0) {
    return
  }

  return normalised.map(item => parseSingleLinkItem(item))
}
