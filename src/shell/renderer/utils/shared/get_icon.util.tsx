import { ENTRY_TYPE_GLYPH } from '@core/domain/constants/entry.const'
import type { RpcKnowledge } from '@shared/rpc'
import type { ReactNode } from 'react'

import { BookmarkEntryIcon } from '../../components/shared/primitives/bookmark_entry_icon.component'
import { BrandIconOrGlyph } from '../../components/shared/primitives/brand_icon_or_glyph.component'
import { ENTRY_TYPE_DEFAULT_SVG_BASENAME } from '../../constants/entry_type_icon_basename.const'
import { TAG_BRAND_GLYPHS } from '../../constants/icons.const'
import { TAG_BRAND_SVG_BASENAME } from '../../constants/tag_brand_svg_map.const'

/**
 * Row icon: bookmarks use **favicon first**, then tag brand SVG, then
 * `bookmark.svg`. Other types use tag brand SVG when mapped, else default type SVGs.
 */
export function getIcon(entry: RpcKnowledge): ReactNode {
  const title = entry.tags.length > 0 ? entry.tags.join(', ') : entry.type
  const fallback = ENTRY_TYPE_GLYPH[entry.type]
  if (entry.type === 'bookmark') {
    return <BookmarkEntryIcon entry={entry} fallbackChar={fallback} key={entry.key} title={title} />
  }
  for (const t of entry.tags) {
    const basename = TAG_BRAND_SVG_BASENAME[t]
    if (basename !== undefined) {
      const glyph = TAG_BRAND_GLYPHS[t] ?? fallback
      return <BrandIconOrGlyph basename={basename} title={title} fallbackChar={glyph} />
    }
  }
  const basename = ENTRY_TYPE_DEFAULT_SVG_BASENAME[entry.type]
  return <BrandIconOrGlyph basename={basename} title={title} fallbackChar={fallback} />
}
