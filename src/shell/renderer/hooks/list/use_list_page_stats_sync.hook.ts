import type { ListStats, RpcDbStats, RpcImportResult } from '@shared/rpc'
import { useCallback, useEffect, useState } from 'react'

import { getListStats, getStats, getSyncInfo, setSyncMessageHandlers, syncRpc } from '../../rpc/client'

export function useListPageStatsSync(refreshList: (append: boolean) => Promise<void>) {
  const [stats, setStats] = useState<ListStats | null>(null)
  const [dbStats, setDbStats] = useState<RpcDbStats | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncProg, setSyncProg] = useState<{ processed: number; total: number } | undefined>(undefined)
  const [toastResult, setToastResult] = useState<RpcImportResult | null>(null)
  const [syncInfo, setSyncInfo] = useState<{ sourcesDir: string; fileCount: number } | null>(null)

  const dismissToast = useCallback(() => setToastResult(null), [])

  const refreshStats = useCallback(async () => {
    const s = await getListStats()
    setStats(s)
    const d = await getStats()
    setDbStats(d)
    if (s.total === 0) {
      getSyncInfo()
        .then(setSyncInfo)
        .catch(() => undefined)
    }
  }, [])

  useEffect(() => {
    refreshStats().catch(() => undefined)
  }, [refreshStats])

  useEffect(() => {
    setSyncMessageHandlers({
      onProgress: p => setSyncProg({ processed: p.processed, total: p.total }),
      onComplete: (result: RpcImportResult) => {
        setSyncing(false)
        setSyncProg(undefined)
        setToastResult(result)
        refreshStats().catch(() => undefined)
        refreshList(false).catch(() => undefined)
      }
    })
  }, [refreshList, refreshStats])

  const onSync = () => {
    if (syncing) return
    setSyncing(true)
    setSyncProg(undefined)
    setToastResult(null)
    syncRpc().catch((err: unknown) => {
      setSyncing(false)
      setSyncProg(undefined)
      setToastResult({
        filesProcessed: 0,
        inserted: 0,
        updated: 0,
        errors: [err instanceof Error ? err.message : String(err)]
      })
    })
  }

  return { stats, dbStats, refreshStats, syncing, syncProg, onSync, toastResult, dismissToast, syncInfo }
}
