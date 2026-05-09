import type { PreviewImageResult, RpcKnowledge } from '@shared/rpc'
import { getIcon } from '../../utils/shared/get_icon.util'
import { BadgeAccessory } from '../shared/badge_accessory.component'
import { MdView } from '../shared/md_view.component'
import { PreviewImage } from '../shared/preview_image.component'
import { DependencyGraph } from './dependency_graph.component'
import { MetadataSidebar } from './metadata_sidebar.component'

type NoteBlock = NonNullable<RpcKnowledge['notes']>[number]
type LinkItem = NonNullable<RpcKnowledge['links']>[number]
type LinkDisplay = { title: string; url: string }

function notesToMarkdown(notes: RpcKnowledge['notes']): string {
  if (!notes || notes.length === 0) return ''
  return notes
    .map((block: NoteBlock) => {
      const entry = Object.entries(block)[0]
      if (!entry) return ''
      const [lang, content] = entry
      if (lang === 'md') return content
      return `\`\`\`${lang}\n${content}\n\`\`\``
    })
    .filter(Boolean)
    .join('\n\n')
}

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

function notesToDoc(entry: RpcKnowledge): string {
  const noteMd = notesToMarkdown(entry.notes)
  const desc = entry.desc ? `> ${entry.desc}` : ''
  if (desc && noteMd) return `${desc}\n\n${noteMd}`
  return desc || noteMd
}

export type DetailPageViewProps = {
  entry: RpcKnowledge | null
  loading?: boolean
  allEntries: RpcKnowledge[]
  onClose: () => void
  onSelectEntry: (id: number) => void
  onOpenExternal: (url: string) => void | Promise<void>
  onFetchPreviewImage?: (url: string) => Promise<PreviewImageResult | null>
}

export function DetailPageView({
  entry,
  loading = false,
  allEntries,
  onClose,
  onSelectEntry,
  onOpenExternal,
  onFetchPreviewImage
}: DetailPageViewProps) {
  if (loading) {
    return (
      <article className="kb-detailPage">
        <p className="kb-empty">Loading entry…</p>
      </article>
    )
  }

  if (!entry) {
    return (
      <article className="kb-detailPage">
        <button type="button" className="kb-detailPage-close" onClick={onClose} aria-label="Close detail">
          ✕
        </button>
        <p className="kb-empty">Entry not found.</p>
      </article>
    )
  }

  const md = notesToDoc(entry)
  const links = linksToDisplay(entry.links)
  const url = primaryUrl(entry)

  return (
    <article className="kb-detailPage">
      <div className="kb-detailPage-main">
        <section className="kb-detailPage-content">
          <header className="kb-detailPage-header">
            <div className="kb-detailPage-headerRow">
              <span className="kb-detailPage-icon">{getIcon(entry)}</span>
              <span className="kb-detailPage-type">{entry.type}</span>
              <button type="button" className="kb-detailPage-close" onClick={onClose} aria-label="Close detail">
                ✕
              </button>
            </div>
            <h1 className="kb-detailPage-key">{entry.key}</h1>
            {entry.desc ? <p className="kb-detailPage-desc">{entry.desc}</p> : null}
            {entry.tags.length > 0 ? (
              <div className="kb-detailPage-tags">
                {entry.tags.map(t => (
                  <span key={t} className="kb-pill kb-pill--muted">
                    #{t}
                  </span>
                ))}
              </div>
            ) : null}
            {entry.type === 'task' ? (
              <div className="kb-detailPage-badges">
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

          {md ? (
            <section className="kb-detailPage-body">
              <MdView markdown={md} onOpenExternal={onOpenExternal} />
            </section>
          ) : null}

          {entry.type === 'task' ? (
            <DependencyGraph entry={entry} allEntries={allEntries} onSelectEntry={onSelectEntry} />
          ) : null}

          {links.length > 0 ? (
            <section className="kb-detailPage-links">
              <h2 className="kb-detailPage-sectionTitle">Links</h2>
              <ul className="kb-detailPage-linkList">
                {links.map(({ title, url: linkUrl }) => (
                  <li key={linkUrl}>
                    <button
                      type="button"
                      className="kb-detailPage-link"
                      onClick={() => {
                        Promise.resolve(onOpenExternal(linkUrl)).catch(() => undefined)
                      }}
                      title={linkUrl}
                    >
                      {title}
                      <span className="kb-detailPage-linkArrow"> ↗</span>
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
