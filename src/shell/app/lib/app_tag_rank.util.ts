import type { Knowledge } from '../../../core'
import { computeCooccurrence, extractKeywords, SUGGEST_MAX_RESULTS } from './app_tag_suggest.util'

export function rankSuggestedTags(entry: Knowledge, allEntries: Knowledge[]): string[] {
  const existingTags = new Set(entry.tags ?? [])
  const topCooccurrence = computeCooccurrence(entry, allEntries, existingTags)
  const text = `${entry.key} ${entry.desc ?? ''}`.toLowerCase()
  const words = extractKeywords(text)
  const allTags = Array.from(new Set(allEntries.flatMap(e => e.tags ?? [])))
  const keywordMatches = words
    .filter(w => w.length > 2)
    .map(word =>
      allTags.find(
        tag => tag.toLowerCase() === word || tag.toLowerCase().startsWith(word) || tag.toLowerCase().includes(word)
      )
    )
    .filter((tag): tag is string => tag !== undefined && !existingTags.has(tag))
  const combined = [...new Set([...topCooccurrence, ...keywordMatches])]
  return combined.slice(0, SUGGEST_MAX_RESULTS)
}
