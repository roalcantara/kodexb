import type { Knowledge } from '../../../core'

const STOP_WORDS = new Set([
  'the',
  'is',
  'at',
  'which',
  'on',
  'a',
  'an',
  'and',
  'or',
  'but',
  'in',
  'with',
  'to',
  'for',
  'of',
  'that',
  'this',
  'it',
  'as',
  'from',
  'by',
  'how',
  'what',
  'when',
  'where',
  'who',
  'will',
  'can',
  'not',
  'be',
  'do',
  'use',
  'get',
  'set',
  'add',
  'new',
  'one',
  'all',
  'are',
  'was',
  'has'
])

const WORD_SPLIT_RE = /[\s,.;:!?()[\]{}'"<>/\\|`~@#$%^&*+=_-]+/
const SUGGEST_COOCCURRENCE_LIMIT = 5
export const SUGGEST_MAX_RESULTS = 8

export function extractKeywords(text: string): string[] {
  return text.split(WORD_SPLIT_RE).filter(w => w.length > 2 && !STOP_WORDS.has(w))
}

export function countCooccurrence(
  cooccurrence: Map<string, number>,
  otherTags: string[],
  existingTags: Set<string>
): void {
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

export function computeCooccurrence(entry: Knowledge, allEntries: Knowledge[], existingTags: Set<string>): string[] {
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
