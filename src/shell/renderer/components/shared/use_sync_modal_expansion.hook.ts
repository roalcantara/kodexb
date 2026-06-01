import type { RpcImportResult, RpcSyncFileResult } from '@shared/rpc'
import { type RefObject, useEffect, useMemo, useRef, useState } from 'react'
import { buildFileLogViews, type FileLogRowView } from './sync_modal_errors.util'

type ExpansionModel = {
  open: boolean
  phase: string
  fileLog: RpcSyncFileResult[]
  summary: RpcImportResult | null
  processed: number
}

export function useSyncModalExpansion(model: ExpansionModel): {
  expandedPath: string | null
  setExpandedPath: (path: string | null) => void
  views: FileLogRowView[]
  logEndRef: RefObject<HTMLDivElement | null>
} {
  const [expandedPath, setExpandedPath] = useState<string | null>(null)
  const logEndRef = useRef<HTMLDivElement>(null)
  const [autoExpanded, setAutoExpanded] = useState(false)

  const views = useMemo(
    () => buildFileLogViews(model.fileLog, model.summary?.errors ?? []),
    [model.fileLog, model.summary]
  )
  const firstHasIssuesPath = useMemo(() => views.find(v => v.hasIssues)?.path ?? null, [views])

  useEffect(() => {
    if (!model.open) setExpandedPath(null)
  }, [model.open])

  useEffect(() => {
    if (!model.open || model.phase !== 'done') return
    if (autoExpanded) return
    if (firstHasIssuesPath !== null) {
      setExpandedPath(firstHasIssuesPath)
      setAutoExpanded(true)
    }
  }, [model.open, model.phase, firstHasIssuesPath, autoExpanded])

  // biome-ignore lint/correctness/useExhaustiveDependencies: keep log tail in view while rows append; Biome treats fileLog/processed as redundant to open/phase but both advance during active sync
  useEffect(() => {
    if (!model.open || model.phase !== 'active') return
    logEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [model.fileLog.length, model.open, model.phase, model.processed])

  return { expandedPath, setExpandedPath, views, logEndRef }
}
