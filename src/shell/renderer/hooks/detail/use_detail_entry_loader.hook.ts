import type { RpcKnowledge } from '@shared/rpc'
import { useEffect, useState } from 'react'
import type { ShortcutDetailBody } from '../../pages/detail/detail_shortcut_body.component'

type UseDetailEntryLoaderOptions = {
  entryId: number
  loadEntry: (id: number) => Promise<RpcKnowledge | null>
}

export function useDetailEntryLoader({ entryId, loadEntry }: UseDetailEntryLoaderOptions) {
  const [entry, setEntry] = useState<RpcKnowledge | null>(null)
  const [loading, setLoading] = useState(true)
  const [body, setBody] = useState<ShortcutDetailBody>({ mode: 'keymap', restoreBindingId: null })

  useEffect(() => {
    let alive = true
    setLoading(true)
    setEntry(null)
    setBody({ mode: 'keymap', restoreBindingId: null })
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

  return { entry, loading, body, setBody }
}
