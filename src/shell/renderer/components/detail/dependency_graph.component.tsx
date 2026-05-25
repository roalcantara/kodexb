import type { RpcKnowledge } from '@shared/rpc'

import { BadgeAccessory } from '../shared/badge_accessory.component'

function dependencyKeys(entry: RpcKnowledge): number[] {
  if (entry.type !== 'task') return []
  return entry.dependsOn ?? []
}

function statusText(entry: RpcKnowledge): string | null {
  return entry.type === 'task' ? entry.status : null
}

function DependencyRow({
  entry,
  fallbackId,
  onSelectEntry
}: {
  entry?: RpcKnowledge
  fallbackId: number
  onSelectEntry: (id: number) => void
}) {
  const label = entry?.key ?? String(fallbackId)
  return (
    <li>
      <button
        type="button"
        className="theme-dependency-row"
        disabled={!entry}
        onClick={() => {
          if (entry) onSelectEntry(entry.id)
        }}
      >
        <span className="theme-dependency-row-key">{label}</span>
        {entry ? (
          <BadgeAccessory entry={entry} allEntries={[entry]} />
        ) : (
          <span className="theme-pill theme-pill--muted">missing</span>
        )}
        {entry && statusText(entry) ? <span className="theme-sr-only">{statusText(entry)}</span> : null}
      </button>
    </li>
  )
}

export type DependencyGraphProps = {
  entry: RpcKnowledge
  allEntries: RpcKnowledge[]
  onSelectEntry: (id: number) => void
}

export function DependencyGraph({ entry, allEntries, onSelectEntry }: DependencyGraphProps) {
  const blockedByKeys = dependencyKeys(entry)
  const blockedBy = blockedByKeys.map(id => ({ id, entry: allEntries.find(row => row.id === id) }))
  const blocking = allEntries.filter(row => row.id !== entry.id && dependencyKeys(row).includes(entry.id))

  if (blockedBy.length === 0 && blocking.length === 0) return null

  return (
    <section className="theme-dependency-graph">
      <h2 className="theme-detail-page-section-title">Dependencies</h2>
      {blockedBy.length > 0 ? (
        <div className="theme-dependency-graph-group">
          <h3>Blocked by</h3>
          <ul>
            {blockedBy.map(dep => (
              <DependencyRow key={dep.id} fallbackId={dep.id} entry={dep.entry} onSelectEntry={onSelectEntry} />
            ))}
          </ul>
        </div>
      ) : null}
      {blocking.length > 0 ? (
        <div className="theme-dependency-graph-group">
          <h3>Blocking</h3>
          <ul>
            {blocking.map(row => (
              <DependencyRow key={row.id} fallbackId={row.id} entry={row} onSelectEntry={onSelectEntry} />
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
