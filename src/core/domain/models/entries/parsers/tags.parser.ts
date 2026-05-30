import type { JsonValue } from 'type-fest'
import { safeParse, TypeBoxValidationError } from '../../../../validation/typebox.helper'
import { PATTERNS } from '../../../constants/entry.const'
import { tagsSchema } from '../schemas/tags.schema'

export const normalizeKnowledgeTag = (item: string): string => item.trim().toLowerCase().replaceAll('-', '_')

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: intentional raw-tag validation rejects case-only changes (devbox_like SY-3)
export function parseTagsFromSource(raw: JsonValue | undefined): string[] {
  if (!Array.isArray(raw)) {
    throw new TypeBoxValidationError([
      {
        path: '/tags',
        message: 'tags must be an array',
        schema: {},
        value: raw,
        type: 0
      } as never
    ])
  }

  const seen = new Set<string>()
  const out: string[] = []

  for (const el of raw) {
    if (typeof el !== 'string') continue
    const rawTrimmed = el.trim()
    if (!rawTrimmed) continue
    const n = normalizeKnowledgeTag(el)
    if (!PATTERNS.tag.test(rawTrimmed)) {
      if (PATTERNS.tag.test(n)) {
        if (!n.includes('_')) {
          throw new TypeBoxValidationError([
            {
              path: '/tags',
              message: `Invalid tag "${rawTrimmed}"`,
              schema: {},
              value: el,
              type: 0
            } as never
          ])
        }
      } else {
        throw new TypeBoxValidationError([
          {
            path: '/tags',
            message: `Invalid tag "${rawTrimmed}"`,
            schema: {},
            value: el,
            type: 0
          } as never
        ])
      }
    }
    if (seen.has(n)) continue
    seen.add(n)
    out.push(n)
  }

  const result = safeParse(tagsSchema, out)
  if (!result.ok) {
    throw new TypeBoxValidationError(
      result.errors.map(e => {
        let message = e.message
        if (message.includes('match pattern')) {
          message = 'Each tag must use only a-z, 0-9, and underscores'
        } else if (message.includes('minItems')) {
          message = 'At least one tag is required'
        } else if (message.includes('maxItems')) {
          message = 'At most 4 tags are allowed'
        }
        return { ...e, message }
      })
    )
  }

  return result.data
}
