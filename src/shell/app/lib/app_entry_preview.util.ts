import type { PreviewImageResult } from '../../../shared/rpc'

export const OG_IMAGE_RE = /<meta\s+[^>]*(?:property|name)=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i
export const OG_IMAGE_REVERSE_RE = /<meta\s+[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']og:image["'][^>]*>/i
export const YOUTUBE_ID_RE = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{6,})/
export const OG_FETCH_TIMEOUT_MS = 5_000

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
