import type { PreviewImageResult, RpcKnowledge } from '@shared/rpc'
import { fireAndForget } from '@shared/utils'
import type React from 'react'
import { getIcon } from '../../utils/shared/get_icon.util'
import { BadgeAccessory } from '../shared/badge_accessory.component'
import { MdView } from '../shared/md_view.component'
import { PreviewImage } from '../shared/preview_image.component'
import { DependencyGraph } from './dependency_graph.component'
import { MetadataSidebar } from './metadata_sidebar.component'

type LinkItem = NonNullable<RpcKnowledge['links']>[number]
type LinkDisplay = { title: string; url: string }

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

function pushLinksFromObjectRecord(rec: Record<string, string | string[]>, out: LinkDisplay[]): void {
  for (const [title, urlOrUrls] of Object.entries(rec)) {
    if (typeof urlOrUrls === 'string') {
      out.push({ title, url: urlOrUrls })
      continue
    }
    if (!Array.isArray(urlOrUrls)) continue
    for (const url of urlOrUrls) {
      if (typeof url === 'string') out.push({ title, url })
    }
  }
}

function linksToDisplay(links: RpcKnowledge['links']): LinkDisplay[] {
  if (!links || links.length === 0) return []
  const out: LinkDisplay[] = []
  for (const item of links as LinkItem[]) {
    if (typeof item === 'string') {
      out.push({ title: safeHostname(item), url: item })
      continue
    }
    pushLinksFromObjectRecord(item as Record<string, string | string[]>, out)
  }
  return out
}

function primaryUrl(entry: RpcKnowledge): string | null {
  if (entry.key.startsWith('http://') || entry.key.startsWith('https://')) return entry.key
  const firstLink = linksToDisplay(entry.links)[0]?.url
  return firstLink ?? null
}

export type DetailPageViewProps = {
  entry: RpcKnowledge | null
  loading?: boolean
  allEntries: RpcKnowledge[]
  onClose: () => void
  onSelectEntry: (id: number) => void
  onOpenExternal: (url: string) => void | Promise<void>
  onFetchPreviewImage?: (url: string) => Promise<PreviewImageResult | null>
  bodyContent?: React.ReactNode
}

export function DetailPageView({
  entry,
  loading = false,
  allEntries,
  onClose,
  onSelectEntry,
  onOpenExternal,
  onFetchPreviewImage,
  bodyContent
}: DetailPageViewProps) {
  if (loading) {
    return (
      <article className="cmp-detail-page">
        <p className="cmp-list-empty">Loading entry…</p>
      </article>
    )
  }

  if (!entry) {
    return (
      <article className="cmp-detail-page">
        <button type="button" className="cmp-detail-page-close" onClick={onClose} aria-label="Close detail">
          ✕
        </button>
        <p className="cmp-list-empty">Entry not found.</p>
      </article>
    )
  }

  const md = entry.doc ?? ''
  const links = linksToDisplay(entry.links)
  const url = primaryUrl(entry)

  return (
    <article className="cmp-detail-page">
      <div className="cmp-detail-page-main">
        <section className="cmp-detail-page-content">
          <header className="cmp-detail-page-header">
            <div className="cmp-detail-page-header-row">
              <span className="cmp-detail-page-icon">{getIcon(entry)}</span>
              <span className="cmp-detail-page-type">{entry.type}</span>
              <button type="button" className="cmp-detail-page-close" onClick={onClose} aria-label="Close detail">
                ✕
              </button>
            </div>
            <h1 className="cmp-detail-page-key">{entry.key}</h1>
            {entry.desc ? <p className="cmp-detail-page-desc">{entry.desc}</p> : null}
            {entry.tags.length > 0 ? (
              <div className="cmp-detail-page-tags">
                {entry.tags.map(t => (
                  <span key={t} className="cmp-pill cmp-pill--muted">
                    #{t}
                  </span>
                ))}
              </div>
            ) : null}
            {entry.type === 'task' ? (
              <div className="cmp-detail-page-badges">
                <BadgeAccessory entry={entry} allEntries={allEntries} />
              </div>
            ) : null}
            {url ? (
              <PreviewImage
                url={url}
                fetchImage={onFetchPreviewImage}
                openUrl={linkUrl => Promise.resolve(onOpenExternal(linkUrl))}
              />
            ) : null}
          </header>

          {md || bodyContent ? (
            <section className="cmp-detail-page-body">
              {bodyContent ?? <MdView markdown={md ?? ''} onOpenExternal={onOpenExternal} />}
            </section>
          ) : null}

          {entry.type === 'task' ? (
            <DependencyGraph entry={entry} allEntries={allEntries} onSelectEntry={onSelectEntry} />
          ) : null}

          {links.length > 0 ? (
            <section className="cmp-detail-page-links">
              <h2 className="cmp-detail-page-section-title">Links</h2>
              <ul className="cmp-detail-page-link-list">
                {links.map(({ title, url: linkUrl }) => (
                  <li key={linkUrl}>
                    <button
                      type="button"
                      className="cmp-detail-page-link"
                      onClick={() => {
                        fireAndForget(Promise.resolve(onOpenExternal(linkUrl)))
                      }}
                      title={linkUrl}
                    >
                      {title}
                      <span className="cmp-detail-page-link-arrow"> ↗</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </section>
        <MetadataSidebar entry={entry} />
      </div>
    </article>
  )
}
