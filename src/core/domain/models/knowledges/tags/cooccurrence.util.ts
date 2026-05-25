import type { Knowledge } from '../schemas/knowledge.schema'

const SUGGEST_COOCCURRENCE_LIMIT = 5

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
