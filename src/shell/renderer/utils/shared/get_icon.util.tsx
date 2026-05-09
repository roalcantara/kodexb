import type { RpcKnowledge } from '@shared/rpc'
import type { ReactNode } from 'react'

import { BrandIconOrGlyph } from '../../components/shared/brand_icon_or_glyph.component'
import { TAG_BRAND_GLYPHS } from '../../constants/icons.const'
import { TAG_BRAND_SVG_BASENAME } from '../../constants/tag_brand_svg_map.const'

function typeGlyphChar(entry: RpcKnowledge): string {
  switch (entry.type) {
    case 'bookmark':
      return '◆'
    case 'command':
      return '▸'
    case 'cheat':
      return '~'
    case 'task':
      return '✓'
  }
}

/** Row icon: brand SVG from `assets/images/` when mapped, else type glyph. */
export function getIcon(entry: RpcKnowledge): ReactNode {
  const title = entry.tags.length > 0 ? entry.tags.join(', ') : entry.type
  const fallback = typeGlyphChar(entry)
  for (const t of entry.tags) {
    const basename = TAG_BRAND_SVG_BASENAME[t]
    if (basename !== undefined) {
      const glyph = TAG_BRAND_GLYPHS[t] ?? fallback
      return <BrandIconOrGlyph basename={basename} title={title} fallbackChar={glyph} />
    }
  }
  return (
    <span className="kb-entryGlyph" title={title}>
      {fallback}
    </span>
  )
}
