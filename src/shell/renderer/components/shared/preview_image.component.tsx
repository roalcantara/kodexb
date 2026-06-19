import type { PreviewImageResult } from '@shared/rpc'
import { fireAndForget } from '@shared/utils'
import { useEffect, useMemo, useState } from 'react'

const YOUTUBE_ID_RE = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{6,})/
const OG_HIDE_TIMEOUT_MS = 5_000

function youtubeThumbnail(url: string): string | null {
  const id = YOUTUBE_ID_RE.exec(url)?.[1]
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null
}

export type PreviewImageProps = {
  url: string
  fetchImage?: (url: string) => Promise<PreviewImageResult | null>
  openUrl?: (url: string) => Promise<void>
}

function defaultFetchImage(url: string): Promise<PreviewImageResult | null> {
  return import('../../rpc/client').then(m => m.fetchPreviewImage(url))
}

function defaultOpenUrl(url: string): Promise<void> {
  return import('../../rpc/client').then(m => m.openExternal(url))
}

function PreviewImageFigure({
  imageUrl,
  youtubeImage,
  url,
  openUrl
}: {
  imageUrl: string
  youtubeImage: string | null
  url: string
  openUrl: (url: string) => Promise<void>
}) {
  return (
    <figure className="cmp-preview-image">
      <img src={imageUrl} alt="" />
      {youtubeImage ? (
        <button
          type="button"
          className="cmp-preview-image-open"
          onClick={() => {
            fireAndForget(openUrl(url))
          }}
        >
          ▶ Open on YouTube
        </button>
      ) : null}
    </figure>
  )
}

export function PreviewImage({ url, fetchImage = defaultFetchImage, openUrl = defaultOpenUrl }: PreviewImageProps) {
  const youtubeImage = useMemo(() => youtubeThumbnail(url), [url])
  const [imageUrl, setImageUrl] = useState<string | null>(youtubeImage)
  const [loading, setLoading] = useState(!youtubeImage)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    if (youtubeImage) {
      setImageUrl(youtubeImage)
      setLoading(false)
      setHidden(false)
      return
    }

    let alive = true
    setLoading(true)
    setHidden(false)
    setImageUrl(null)

    const timeout = window.setTimeout(() => {
      if (!alive) return
      setLoading(false)
      setHidden(true)
    }, OG_HIDE_TIMEOUT_MS)

    fetchImage(url)
      .then(result => {
        if (!alive) return
        const payload: PreviewImageResult | null = result
        if (payload === null) return
        window.clearTimeout(timeout)
        setLoading(false)
        if (payload.url) {
          setImageUrl(payload.url)
          return
        }
        setHidden(true)
      })
      .catch(() => {
        if (!alive) return
        window.clearTimeout(timeout)
        setLoading(false)
        setHidden(true)
      })

    return () => {
      alive = false
      window.clearTimeout(timeout)
    }
  }, [fetchImage, url, youtubeImage])

  if (hidden) return null
  if (loading)
    return (
      <div className="cmp-preview-image cmp-preview-image--skeleton" role="status" aria-label="Loading preview image" />
    )
  if (!imageUrl) return null

  return <PreviewImageFigure imageUrl={imageUrl} youtubeImage={youtubeImage} url={url} openUrl={openUrl} />
}
