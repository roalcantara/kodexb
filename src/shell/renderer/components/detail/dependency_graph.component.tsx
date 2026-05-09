import type { RpcKnowledge } from '@shared/rpc'

import { BadgeAccessory } from '../shared/badge_accessory.component'

const DEP_KEYS = ['dependsOn', 'depends_on', 'depends', 'deps']

function dependencyKeys(entry: RpcKnowledge): string[] {
  if (entry.type !== 'task') return []
  const meta = entry.meta as Record<string, unknown> | undefined
  if (!meta) return []
  for (const key of DEP_KEYS) {
    const raw = meta[key]
    if (Array.isArray(raw)) return raw.filter((v): v is string => typeof v === 'string' && v.length > 0)
    if (typeof raw === 'string') {
      return raw
        .split(',')
        .map(v => v.trim())
        .filter(Boolean)
    }
  }
  return []
}

function statusText(entry: RpcKnowledge): string | null {
  return entry.type === 'task' ? entry.status : null
}

function DependencyRow({
  entry,
  fallbackKey,
  onSelectEntry
}: {
  entry?: RpcKnowledge
  fallbackKey: string
  onSelectEntry: (id: number) => void
}) {
  const label = entry?.key ?? fallbackKey
  return (
    <li>
      <button
        type="button"
        className="kb-dependencyRow"
        disabled={!entry}
        onClick={() => {
          if (entry) onSelectEntry(entry.id)
        }}
      >
        <span className="kb-dependencyRow-key">{label}</span>
        {entry ? (
          <BadgeAccessory entry={entry} allEntries={[entry]} />
        ) : (
          <span className="kb-pill kb-pill--muted">missing</span>
        )}
        {entry && statusText(entry) ? <span className="kb-srOnly">{statusText(entry)}</span> : null}
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
  const blockedBy = blockedByKeys.map(key => ({ key, entry: allEntries.find(row => row.key === key) }))
  const blocking = allEntries.filter(row => row.id !== entry.id && dependencyKeys(row).includes(entry.key))

  if (blockedBy.length === 0 && blocking.length === 0) return null

  return (
    <section className="kb-dependencyGraph">
      <h2 className="kb-detailPage-sectionTitle">Dependencies</h2>
      {blockedBy.length > 0 ? (
        <div className="kb-dependencyGraph-group">
          <h3>Blocked by</h3>
          <ul>
            {blockedBy.map(dep => (
              <DependencyRow key={dep.key} fallbackKey={dep.key} entry={dep.entry} onSelectEntry={onSelectEntry} />
            ))}
          </ul>
        </div>
      ) : null}
      {blocking.length > 0 ? (
        <div className="kb-dependencyGraph-group">
          <h3>Blocking</h3>
          <ul>
            {blocking.map(row => (
              <DependencyRow key={row.id} fallbackKey={row.key} entry={row} onSelectEntry={onSelectEntry} />
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
