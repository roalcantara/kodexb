import type { RpcKnowledge } from '@shared/rpc'
import { useEffect, useState } from 'react'

import { DetailPageView } from '../../components/detail/detail_view.component'

export type DetailPageProps = {
  entryId: number
  allEntries: RpcKnowledge[]
  onClose: () => void
  onSelectEntry: (id: number) => void
  loadEntry?: (id: number) => Promise<RpcKnowledge | null>
}

function defaultLoadEntry(id: number): Promise<RpcKnowledge | null> {
  return import('../../rpc/client').then(m => m.getEntry(id))
}

function defaultOpenExternal(url: string): Promise<void> {
  return import('../../rpc/client').then(m => m.openExternal(url))
}

export function DetailPage({
  entryId,
  allEntries,
  onClose,
  onSelectEntry,
  loadEntry = defaultLoadEntry
}: DetailPageProps) {
  const [entry, setEntry] = useState<RpcKnowledge | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setEntry(null)
    loadEntry(entryId)
      .then(result => {
        if (!alive) return
        setEntry(result)
        setLoading(false)
      })
      .catch(() => {
        if (!alive) return
        setEntry(null)
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [entryId, loadEntry])

  return (
    <DetailPageView
      entry={entry}
      loading={loading}
      allEntries={allEntries}
      onClose={onClose}
      onSelectEntry={onSelectEntry}
      onOpenExternal={url => Promise.resolve(defaultOpenExternal(url)).catch(() => undefined)}
    />
  )
}
