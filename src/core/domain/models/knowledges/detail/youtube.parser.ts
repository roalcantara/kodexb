const YOUTUBE_PATH_RE = /^\//

/**
 * Returns the YouTube video ID for watch and short-link URLs, else null.
 */
export const extractYouTubeId = (url: string) => {
  if (!url) return null

  try {
    const parsed = new URL(url)

    if (parsed.hostname === 'youtu.be') {
      const id = parsed.pathname.replace(YOUTUBE_PATH_RE, '').split('/')[0]
      return id || null
    }

    if (parsed.hostname.endsWith('youtube.com')) {
      const id = parsed.searchParams.get('v')
      return id || null
    }
  } catch {
    return null
  }

  return null
}
export const youTubeEmbedUrl = (id: string) => `https://www.youtube.com/embed/${id}?feature=oembed`

const YOUTUBE_THUMB_JPEG_STEMS = ['maxresdefault', 'sddefault', 'hqdefault', 'mqdefault'] as const
type YouTubeThumbJpegStem = (typeof YOUTUBE_THUMB_JPEG_STEMS)[number]

const youTubeThumbJpegUrl = (id: string, stem: YouTubeThumbJpegStem) => `https://img.youtube.com/vi/${id}/${stem}.jpg`

/** HD thumbnail (may 404 for some videos). */
export const youTubeThumbnail = (id: string) => youTubeThumbJpegUrl(id, 'maxresdefault')
/** Smaller default; reliable for detail previews. */
export const youTubeThumbnailMq = (id: string) => youTubeThumbJpegUrl(id, 'mqdefault')

/** img.youtube.com JPEGs from highest to lowest resolution (first fetchable wins). */
export function youTubeThumbnailCandidates(id: string): string[] {
  return YOUTUBE_THUMB_JPEG_STEMS.map(stem => youTubeThumbJpegUrl(id, stem))
}
