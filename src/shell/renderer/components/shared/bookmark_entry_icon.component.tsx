import type { RpcKnowledge } from '@shared/rpc'
import { useMemo, useState } from 'react'

import { TAG_BRAND_GLYPHS } from '../../constants/icons.const'
import { TAG_BRAND_SVG_BASENAME } from '../../constants/tag_brand_svg_map.const'
import { brandBasenameForBookmarkHost } from '../../utils/shared/bookmark_host_brand_basename.util'
import { faviconUrlForBookmarkKey } from '../../utils/shared/favicon_url_for_bookmark.util'
import { BrandIconOrGlyph } from './brand_icon_or_glyph.component'

export type BookmarkEntryIconProps = {
  entry: Extract<RpcKnowledge, { type: 'bookmark' }>
  fallbackChar: string
  title: string
}

function firstTagBrandMatch(tags: readonly string[], fallbackChar: string): { basename: string; glyph: string } | null {
  for (const t of tags) {
    const basename = TAG_BRAND_SVG_BASENAME[t]
    if (basename !== undefined) {
      return { basename, glyph: TAG_BRAND_GLYPHS[t] ?? fallbackChar }
    }
  }
  return null
}

/**
 * Bookmark list icon: bundled brand for **known-dark favicon hosts** (see
 * `brandBasenameForBookmarkHost`), else **favicon** when `key` is http(s), then
 * tag-mapped brand SVG, then bundled `bookmark.svg`.
 */
export function BookmarkEntryIcon({ entry, title, fallbackChar }: BookmarkEntryIconProps) {
  const hostBrandBasename = useMemo(() => brandBasenameForBookmarkHost(entry.key), [entry.key])
  const faviconUrl = useMemo(() => faviconUrlForBookmarkKey(entry.key), [entry.key])
  const tagBrand = useMemo(() => firstTagBrandMatch(entry.tags, fallbackChar), [entry.tags, fallbackChar])
  const [faviconFailed, setFaviconFailed] = useState(false)

  if (hostBrandBasename !== null) {
    let glyph = TAG_BRAND_GLYPHS[hostBrandBasename] ?? fallbackChar
    for (const t of entry.tags) {
      if (TAG_BRAND_SVG_BASENAME[t] === hostBrandBasename) {
        glyph = TAG_BRAND_GLYPHS[t] ?? fallbackChar
        break
      }
    }
    return <BrandIconOrGlyph basename={hostBrandBasename} title={title} fallbackChar={glyph} />
  }

  const tryFavicon = faviconUrl !== null && !faviconFailed

  if (tryFavicon) {
    return (
      <img
        alt=""
        aria-label={title}
        className="kb-entryGlyph kb-entryFavicon"
        decoding="async"
        loading="lazy"
        referrerPolicy="no-referrer"
        src={faviconUrl}
        title={title}
        onError={() => {
          setFaviconFailed(true)
        }}
      />
    )
  }

  if (tagBrand !== null) {
    return <BrandIconOrGlyph basename={tagBrand.basename} title={title} fallbackChar={tagBrand.glyph} />
  }

  return <BrandIconOrGlyph basename="bookmark" title={title} fallbackChar={fallbackChar} />
}
