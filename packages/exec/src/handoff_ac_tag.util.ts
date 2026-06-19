/** AC tag ↔ slice id helpers for handoff emit (mirrors packages/ops/src/governance/registries/catalog/tag.script). */

export const AC_TAG_RE = /^@ac:SF-(\d+)_AC(\d+)$/i

export function sliceIdFromAcTag(acTag: string): string | null {
  const normalized = acTag.startsWith('@') ? acTag : `@${acTag}`
  const match = normalized.match(AC_TAG_RE)
  if (!match?.[1] || !match[2]) return null
  return `sf${match[1]}ac${match[2]}`.toLowerCase()
}
