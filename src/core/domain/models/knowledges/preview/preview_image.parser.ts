import type { PreviewImageResult } from '@shared/rpc'
import { OG_IMAGE_RE, OG_IMAGE_REVERSE_RE, YOUTUBE_ID_RE } from './og_image.regex.const'

export function youtubePreviewImage(url: string): PreviewImageResult | null {
  const id = YOUTUBE_ID_RE.exec(url)?.[1]
  return id ? { url: `https://img.youtube.com/vi/${id}/mqdefault.jpg` } : null
}

export function previewImageFromHtml(html: string, baseUrl: string): PreviewImageResult | null {
  const image = OG_IMAGE_RE.exec(html)?.[1] ?? OG_IMAGE_REVERSE_RE.exec(html)?.[1]
  if (!image) return null
  try {
    return { url: new URL(image, baseUrl).toString() }
  } catch {
    return null
  }
}
