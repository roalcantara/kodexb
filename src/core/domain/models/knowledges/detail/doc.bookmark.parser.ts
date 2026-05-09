import type { BookmarkKnowledge } from '../schemas/knowledge.schema'
import { extractYouTubeId, youTubeEmbedUrl, youTubeThumbnailMq } from './youtube.parser'

/**
 * Preamble for a bookmark entry.
 *
 * - YouTube URL  → embed link + thumbnail image line
 * - Non-YouTube with preview image → image with desc as title
 * - Non-YouTube without preview    → ''
 */
export const buildBookmarkPreamble = (entry: BookmarkKnowledge, previewImageUrl?: string) => {
  const ytId = extractYouTubeId(entry.key)

  if (ytId) {
    const embedUrl = youTubeEmbedUrl(ytId)
    const thumb = youTubeThumbnailMq(ytId)
    return `[${entry.desc}](${embedUrl})\n\n![YouTube Thumbnail](${thumb})`
  }

  if (previewImageUrl) {
    return `![${entry.desc}](${previewImageUrl})`
  }

  return ''
}
