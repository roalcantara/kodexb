import type { PreviewImageResult } from '../../../shared/rpc'
import { OG_FETCH_TIMEOUT_MS, previewImageFromHtml, youtubePreviewImage } from './app_entry_preview.util'

export async function fetchPreviewImageFromUrl(url: string): Promise<PreviewImageResult | null> {
  const parsed = new URL(url)
  const youtube = youtubePreviewImage(parsed.toString())
  if (youtube) return youtube
  const res = await fetch(parsed, { signal: AbortSignal.timeout(OG_FETCH_TIMEOUT_MS) }).catch(() => null)
  if (!res?.ok) return null
  const html = await res.text().catch(() => '')
  return previewImageFromHtml(html, parsed.toString())
}
