import { previewImageFromHtml, youtubePreviewImage } from '@core/domain/models/knowledges/preview/preview_image.parser'
import type { PreviewImageResult } from '@shared/rpc'
import { OG_FETCH_TIMEOUT_MS } from './entry_preview.util'

function isWebUrl(parsed: URL): boolean {
  return parsed.protocol === 'http:' || parsed.protocol === 'https:'
}

export async function fetchPreviewImageFromUrl(url: string): Promise<PreviewImageResult | null> {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (!isWebUrl(parsed)) return null
  const youtube = youtubePreviewImage(parsed.toString())
  if (youtube) return youtube
  const res = await fetch(parsed, { signal: AbortSignal.timeout(OG_FETCH_TIMEOUT_MS) }).catch(() => null)
  if (!res?.ok) return null
  const html = await res.text().catch(() => '')
  return previewImageFromHtml(html, parsed.toString())
}
