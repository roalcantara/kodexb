import type { RpcImportResult, RpcSyncFileResult } from '@shared/rpc'
import { type RefObject, useEffect, useRef, useState } from 'react'

export type SyncModalPhase = 'preparing' | 'active' | 'done' | 'failed'

export type SyncModalModel = {
  open: boolean
  phase: SyncModalPhase
  sourcesDir: string
  totalFiles: number
  processed: number
  fileLog: RpcSyncFileResult[]
  summary: RpcImportResult | null
  failMessage: string | null
}

export type SyncModalProps = {
  model: SyncModalModel
  onDismiss: () => void
}

function fileSummary(f: RpcSyncFileResult): string {
  if (!f.ok) return 'Failed'
  const parts: string[] = []
  if (f.inserted > 0) parts.push(`${f.inserted} inserted`)
  if (f.updated > 0) parts.push(`${f.updated} updated`)
  if (parts.length === 0) return 'No rows changed'
  return parts.join(', ')
}

function SyncModalFileLog({
  fileLog,
  expandedPath,
  setExpandedPath,
  logEndRef
}: {
  fileLog: RpcSyncFileResult[]
  expandedPath: string | null
  setExpandedPath: (path: string | null) => void
  logEndRef: RefObject<HTMLDivElement | null>
}) {
  return (
    <div className="theme-sync-modal-log" role="log" aria-live="polite" aria-relevant="additions">
      {fileLog.map(f => (
        <div
          key={`${f.path}-${f.label}`}
          className={`theme-sync-modal-file-row${f.ok ? '' : ' theme-sync-modal-file-row--error'}`}
        >
          <div className="theme-sync-modal-file-main">
            <span className="theme-sync-modal-file-name">{f.label}</span>
            <span className="theme-sync-modal-file-stat">{fileSummary(f)}</span>
          </div>
          {!f.ok && f.error ? (
            <div className="theme-sync-modal-file-error">
              <button
                type="button"
                className="theme-sync-modal-link-btn"
                onClick={() => setExpandedPath(expandedPath === f.path ? null : f.path)}
              >
                {expandedPath === f.path ? 'Hide details' : 'Inspect error'}
              </button>
              {expandedPath === f.path ? <pre className="theme-sync-modal-error-detail">{f.error}</pre> : null}
            </div>
          ) : null}
        </div>
      ))}
      <div ref={logEndRef} />
    </div>
  )
}

function SyncModalSummary({ summary }: { summary: RpcImportResult }) {
  return (
    <div className="theme-sync-modal-summary">
      <h3 className="theme-sync-modal-summary-title">Sync finished</h3>
      <ul className="theme-sync-modal-summary-list">
        <li>Files processed: {summary.filesProcessed}</li>
        <li>Rows inserted: {summary.inserted}</li>
        <li>Rows updated: {summary.updated}</li>
        <li>
          Errors: {summary.errors.length} ({summary.errors.length === 0 ? 'none' : 'see log above'})
        </li>
      </ul>
      {summary.errors.length > 0 ? (
        <ul className="theme-sync-modal-summary-errors">
          {summary.errors.map(err => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export function SyncModal({ model, onDismiss }: SyncModalProps) {
  const [expandedPath, setExpandedPath] = useState<string | null>(null)
  const logEndRef = useRef<HTMLDivElement>(null)

  // biome-ignore lint/correctness/useExhaustiveDependencies: keep log tail in view while rows append; Biome treats fileLog/processed as redundant to open/phase but both advance during active sync
  useEffect(() => {
    if (!model.open || model.phase !== 'active') return
    logEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [model.fileLog.length, model.open, model.phase, model.processed])

  useEffect(() => {
    if (!model.open) setExpandedPath(null)
  }, [model.open])

  if (!model.open) return null

  const totalBar = Math.max(1, model.totalFiles)
  const processedBar = model.phase === 'preparing' ? 0 : Math.min(model.processed, totalBar)
  const showDismiss = model.phase === 'done' || model.phase === 'failed'

  return (
    <div className="theme-sync-modal-backdrop" role="presentation">
      <div className="theme-sync-modal" role="dialog" aria-modal="true" aria-labelledby="theme-sync-modal-title">
        <h2 id="theme-sync-modal-title" className="theme-sync-modal-title">
          Sync sources
        </h2>

        {model.phase === 'preparing' ? (
          <p className="theme-sync-modal-muted">Reading source folder…</p>
        ) : (
          <>
            <div className="theme-sync-modal-path-block">
              <span className="theme-sync-modal-label">Folder</span>
              <code className="theme-sync-modal-path">{model.sourcesDir || '—'}</code>
            </div>
            <p className="theme-sync-modal-count">
              <strong>{model.totalFiles}</strong> source file{model.totalFiles === 1 ? '' : 's'} to process
            </p>
          </>
        )}

        <div className="theme-sync-modal-progress-row">
          <progress className="theme-sync-modal-bar" value={processedBar} max={totalBar} />
          <span className="theme-sync-modal-progress-label">
            {model.phase === 'preparing' ? 'Not started' : `${model.processed} / ${model.totalFiles} processed`}
          </span>
        </div>

        {model.phase === 'failed' && model.failMessage ? (
          <p className="theme-sync-modal-error-banner" role="alert">
            {model.failMessage}
          </p>
        ) : null}

        {model.phase === 'active' || model.phase === 'done' ? (
          <SyncModalFileLog
            fileLog={model.fileLog}
            expandedPath={expandedPath}
            setExpandedPath={setExpandedPath}
            logEndRef={logEndRef}
          />
        ) : null}

        {model.phase === 'done' && model.summary ? <SyncModalSummary summary={model.summary} /> : null}

        {showDismiss ? (
          <div className="theme-sync-modal-actions">
            <button type="button" className="theme-sync-modal-primary-btn" onClick={onDismiss}>
              Close
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
