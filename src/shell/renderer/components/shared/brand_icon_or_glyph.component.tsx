import { useState } from 'react'

import { brandSvgAssetUrl } from '../../utils/shared/brand_icon_url.util'

export type BrandIconOrGlyphProps = {
  basename: string
  title: string
  fallbackChar: string
}

export function BrandIconOrGlyph({ basename, title, fallbackChar }: BrandIconOrGlyphProps) {
  const [broken, setBroken] = useState(false)
  if (broken) {
    return (
      <span className="cmp-entry-glyph" title={title}>
        {fallbackChar}
      </span>
    )
  }
  return (
    <img
      className="cmp-entry-glyph cmp-entry-glyph-img"
      src={brandSvgAssetUrl(basename)}
      alt=""
      aria-label={title}
      title={title}
      onError={() => setBroken(true)}
    />
  )
}
