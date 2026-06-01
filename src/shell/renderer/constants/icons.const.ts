import { ENTRY_TYPE_GLYPH } from '@core/domain/constants/entry.const'

/**
 * Tag → fallback glyph when the SVG fails to load or no SVG is mapped.
 * SVG basenames live in `tag_brand_svg_map.const.ts` → `assets/images/*.svg`.
 */
export const TAG_BRAND_GLYPHS: Record<string, string> = {
  git: '⎇',
  github: ENTRY_TYPE_GLYPH.bookmark,
  yt: '▶',
  youtube: '▶',
  bun: '🥟',
  aws: '☁',
  dev: '◇',
  web: '🌐',
  example: ENTRY_TYPE_GLYPH.bookmark
}
