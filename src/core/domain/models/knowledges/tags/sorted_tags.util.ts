export function sortedTags(
  tags: Record<string, number>,
  q: string,
  selectedTags: string[] = []
): Array<{ tag: string; count: number }> {
  const needle = q.trim().toLowerCase()
  return Object.entries(tags)
    .filter(([t, count]) => count > 0 || selectedTags.includes(t))
    .filter(([t]) => needle === '' || t.toLowerCase().includes(needle))
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => (a.count === b.count ? a.tag.localeCompare(b.tag) : b.count - a.count))
}
