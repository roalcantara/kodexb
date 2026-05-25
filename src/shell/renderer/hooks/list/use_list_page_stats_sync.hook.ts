import type { ListStats, RpcDbStats } from '@shared/rpc'
import { fireAndForget } from '@shared/utils'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { SyncModalModel } from '../../components/shared/sync_modal.component'
import { getListStats, getStats, getSyncInfo, setSyncMessageHandlers, syncRpc } from '../../rpc/client'
import { listSyncMessageHandlers } from './list_sync_message_handlers.util'

export type UseListPageStatsSyncParams = {
  refreshList: (append: boolean) => Promise<void>
  pushToast: (message: string, type?: 'success' | 'error') => void
}

const initialModal: SyncModalModel = {
  open: false,
  phase: 'preparing',
  sourcesDir: '',
  totalFiles: 0,
  processed: 0,
  fileLog: [],
  summary: null,
  failMessage: null
}

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: composes stats load + sync modal + RPC listener wiring
export function useListPageStatsSync({ refreshList, pushToast }: UseListPageStatsSyncParams) {
  const [stats, setStats] = useState<ListStats | null>(null)
  const [dbStats, setDbStats] = useState<RpcDbStats | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncUi, setSyncUi] = useState<SyncModalModel>(initialModal)
  const [syncInfo, setSyncInfo] = useState<{ sourcesDir: string; fileCount: number } | null>(null)
  const syncModalOpenRef = useRef(false)

  useEffect(() => {
    syncModalOpenRef.current = syncUi.open
  }, [syncUi.open])

  const dismissSyncModal = useCallback(() => {
    syncModalOpenRef.current = false
    setSyncUi(initialModal)
  }, [])

  const refreshStats = useCallback(async () => {
    const s = await getListStats()
    setStats(s)
    const d = await getStats()
    setDbStats(d)
    if (s.total === 0) {
      fireAndForget(getSyncInfo().then(setSyncInfo))
    }
  }, [])

  useEffect(() => {
    fireAndForget(refreshStats())
  }, [refreshStats])

  useEffect(() => {
    const handlers = listSyncMessageHandlers({
      setSyncUi,
      setSyncing,
      syncModalOpenRef,
      pushToast,
      refreshStats,
      refreshList
    })
    setSyncMessageHandlers(handlers)
    return () => setSyncMessageHandlers({})
  }, [refreshList, refreshStats, pushToast])

  const onSync = useCallback(async () => {
    if (syncing) return
    syncModalOpenRef.current = true
    setSyncing(true)
    setSyncUi({
      ...initialModal,
      open: true,
      phase: 'preparing'
    })
    try {
      const info = await getSyncInfo()
      setSyncUi({
        open: true,
        phase: 'active',
        sourcesDir: info.sourcesDir,
        totalFiles: info.fileCount,
        processed: 0,
        fileLog: [],
        summary: null,
        failMessage: null
      })
      syncRpc().catch((err: unknown) => {
        setSyncing(false)
        const msg = err instanceof Error ? err.message : String(err)
        setSyncUi(prev => ({
          ...prev,
          phase: 'failed',
          failMessage: msg
        }))
        pushToast(msg, 'error')
      })
    } catch (err) {
      setSyncing(false)
      const msg = err instanceof Error ? err.message : String(err)
      setSyncUi({
        ...initialModal,
        open: true,
        phase: 'failed',
        failMessage: msg
      })
      pushToast(msg, 'error')
    }
  }, [syncing, pushToast])

  return {
    stats,
    dbStats,
    refreshStats,
    syncing,
    syncUi,
    dismissSyncModal,
    onSync,
    syncInfo
  }
}
