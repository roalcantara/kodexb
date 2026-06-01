import type { RpcKnowledge } from '@shared/rpc'

import { tagFrequencyClassName } from './tag_frequency_class.util'

const TITLE_PREVIEW_LEN = 80
const META_URL_PREVIEW_LEN = 48

export function entryTitleText(entry: RpcKnowledge): string {
  const desc = entry.desc.trim()
  if (desc === '') return entry.key
  return desc.length > TITLE_PREVIEW_LEN ? `${desc.slice(0, TITLE_PREVIEW_LEN)}…` : desc
}

export function entryMetaText(entry: RpcKnowledge): string {
  if (entry.type === 'bookmark') {
    const key = entry.key
    return key.length > META_URL_PREVIEW_LEN ? `${key.slice(0, META_URL_PREVIEW_LEN)}…` : key
  }
  return entry.key
}

export function entryMetaSemanticClass(entry: RpcKnowledge): string {
  switch (entry.type) {
    case 'command':
      return 'semantic-command'
    case 'bookmark':
      return 'semantic-url'
    case 'cheat':
      return 'semantic-cheat'
    case 'task':
      return 'semantic-task-characteristic'
    default:
      return 'semantic-cheat'
  }
}

export function entryGlyphTileClass(entry: RpcKnowledge): string {
  const base = 'cmp-entry-glyph-tile'
  if (entry.type === 'task') return `${base} ${base}--task`
  if (entry.type === 'command' || entry.type === 'cheat') return `${base} ${base}--muted`
  return `${base} ${base}--plain`
}

export type EntryTagItem = {
  key: string
  label: string
  className: string
  title?: string
}

export function entryTagItems(entry: RpcKnowledge, tagCounts: Readonly<Record<string, number>> = {}): EntryTagItem[] {
  return entry.tags.map(tag => {
    const count = tagCounts[tag] ?? 0
    const className = count > 0 ? tagFrequencyClassName(count) : 'cmp-tag'
    return {
      key: tag,
      label: `#${tag}`,
      className,
      title: count > 0 ? `${count} entries` : undefined
    }
  })
}
