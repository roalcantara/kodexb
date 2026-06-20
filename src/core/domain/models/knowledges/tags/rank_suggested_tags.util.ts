import type { Knowledge } from '../schemas/knowledge.schema'
import { STOP_WORDS } from './stop_words.const'
import { SUGGEST_MAX_RESULTS } from './suggest_max_results.const'

const WORD_SPLIT_RE = /[\s,.;:!?()[\]{}'"<>/\\|`~@#$%^&*+=_-]+/
const SUGGEST_COOCCURRENCE_LIMIT = 5

function extractKeywords(text: string): string[] {
  return text.split(WORD_SPLIT_RE).filter(w => w.length > 2 && !STOP_WORDS.has(w))
}

function countCooccurrence(cooccurrence: Map<string, number>, otherTags: string[], existingTags: Set<string>): void {
  const otherSet = new Set(otherTags)
  let sharedHits = 0
  for (const myTag of existingTags) {
    if (otherSet.has(myTag)) sharedHits += 1
  }
  if (sharedHits === 0) return
  for (const tag of otherTags) {
    if (existingTags.has(tag)) continue
    cooccurrence.set(tag, (cooccurrence.get(tag) ?? 0) + sharedHits)
  }
}

function computeCooccurrence(entry: Knowledge, allEntries: Knowledge[], existingTags: Set<string>): string[] {
  const cooccurrence = new Map<string, number>()
  for (const other of allEntries) {
    if (other.id === entry.id) continue
    countCooccurrence(cooccurrence, other.tags ?? [], existingTags)
  }
  return Array.from(cooccurrence.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, SUGGEST_COOCCURRENCE_LIMIT)
    .map(([tag]) => tag)
}

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
