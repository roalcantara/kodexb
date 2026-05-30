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
    <div className="cmp-sync-modal-log" role="log" aria-live="polite" aria-relevant="additions">
      {fileLog.map(f => (
        <div
          key={`${f.path}-${f.label}`}
          className={`cmp-sync-modal-file-row${f.ok ? '' : ' cmp-sync-modal-file-row--error'}`}
        >
          <div className="cmp-sync-modal-file-main">
            <span className="cmp-sync-modal-file-name">{f.label}</span>
            <span className="cmp-sync-modal-file-stat">{fileSummary(f)}</span>
          </div>
          {!f.ok && f.error ? (
            <div className="cmp-sync-modal-file-error">
              <button
                type="button"
                className="cmp-sync-modal-link-btn"
                onClick={() => setExpandedPath(expandedPath === f.path ? null : f.path)}
              >
                {expandedPath === f.path ? 'Hide details' : 'Inspect error'}
              </button>
              {expandedPath === f.path ? <pre className="cmp-sync-modal-error-detail">{f.error}</pre> : null}
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
    <div className="cmp-sync-modal-summary">
      <h3 className="cmp-sync-modal-summary-title">Sync finished</h3>
      <ul className="cmp-sync-modal-summary-list">
        <li>Files processed: {summary.filesProcessed}</li>
        <li>Rows inserted: {summary.inserted}</li>
        <li>Rows updated: {summary.updated}</li>
        <li>
          Errors: {summary.errors.length} ({summary.errors.length === 0 ? 'none' : 'see log above'})
        </li>
        <li>
          Collision warnings: {summary.warnings.length} ({summary.warnings.length === 0 ? 'none' : 'see below'})
        </li>
      </ul>
      {summary.errors.length > 0 ? (
        <ul className="cmp-sync-modal-summary-errors">
          {summary.errors.map(err => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      ) : null}
      {summary.warnings.length > 0 ? (
        <ul className="cmp-sync-modal-summary-warnings">
          {summary.warnings.map(warning => (
            <li key={warning}>{warning}</li>
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
    <div className="cmp-sync-modal-backdrop" role="presentation">
      <div className="cmp-sync-modal" role="dialog" aria-modal="true" aria-labelledby="cmp-sync-modal-title">
        <h2 id="cmp-sync-modal-title" className="cmp-sync-modal-title">
          Sync sources
        </h2>

        {model.phase === 'preparing' ? (
          <p className="cmp-sync-modal-muted">Reading source folder…</p>
        ) : (
          <>
            <div className="cmp-sync-modal-path-block">
              <span className="cmp-sync-modal-label">Folder</span>
              <code className="cmp-sync-modal-path">{model.sourcesDir || '—'}</code>
            </div>
            <p className="cmp-sync-modal-count">
              <strong>{model.totalFiles}</strong> source file{model.totalFiles === 1 ? '' : 's'} to process
            </p>
          </>
        )}

        <div className="cmp-sync-modal-progress-row">
          <progress className="cmp-sync-modal-bar" value={processedBar} max={totalBar} />
          <span className="cmp-sync-modal-progress-label">
            {model.phase === 'preparing' ? 'Not started' : `${model.processed} / ${model.totalFiles} processed`}
          </span>
        </div>

        {model.phase === 'failed' && model.failMessage ? (
          <p className="cmp-sync-modal-error-banner" role="alert">
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
          <div className="cmp-sync-modal-actions">
            <button type="button" className="cmp-sync-modal-primary-btn" onClick={onDismiss}>
              Close
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
