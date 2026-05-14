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
    <div className="kb-syncModal-log" role="log" aria-live="polite" aria-relevant="additions">
      {fileLog.map(f => (
        <div
          key={`${f.path}-${f.label}`}
          className={`kb-syncModal-fileRow${f.ok ? '' : ' kb-syncModal-fileRow--error'}`}
        >
          <div className="kb-syncModal-fileMain">
            <span className="kb-syncModal-fileName">{f.label}</span>
            <span className="kb-syncModal-fileStat">{fileSummary(f)}</span>
          </div>
          {!f.ok && f.error ? (
            <div className="kb-syncModal-fileError">
              <button
                type="button"
                className="kb-syncModal-linkBtn"
                onClick={() => setExpandedPath(expandedPath === f.path ? null : f.path)}
              >
                {expandedPath === f.path ? 'Hide details' : 'Inspect error'}
              </button>
              {expandedPath === f.path ? <pre className="kb-syncModal-errorDetail">{f.error}</pre> : null}
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
    <div className="kb-syncModal-summary">
      <h3 className="kb-syncModal-summaryTitle">Sync finished</h3>
      <ul className="kb-syncModal-summaryList">
        <li>Files processed: {summary.filesProcessed}</li>
        <li>Rows inserted: {summary.inserted}</li>
        <li>Rows updated: {summary.updated}</li>
        <li>
          Errors: {summary.errors.length} ({summary.errors.length === 0 ? 'none' : 'see log above'})
        </li>
      </ul>
      {summary.errors.length > 0 ? (
        <ul className="kb-syncModal-summaryErrors">
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
    <div className="kb-syncModal-backdrop" role="presentation">
      <div className="kb-syncModal" role="dialog" aria-modal="true" aria-labelledby="kb-syncModal-title">
        <h2 id="kb-syncModal-title" className="kb-syncModal-title">
          Sync sources
        </h2>

        {model.phase === 'preparing' ? (
          <p className="kb-syncModal-muted">Reading source folder…</p>
        ) : (
          <>
            <div className="kb-syncModal-pathBlock">
              <span className="kb-syncModal-label">Folder</span>
              <code className="kb-syncModal-path">{model.sourcesDir || '—'}</code>
            </div>
            <p className="kb-syncModal-count">
              <strong>{model.totalFiles}</strong> YAML file{model.totalFiles === 1 ? '' : 's'} to process
            </p>
          </>
        )}

        <div className="kb-syncModal-progressRow">
          <progress className="kb-syncModal-bar" value={processedBar} max={totalBar} />
          <span className="kb-syncModal-progressLabel">
            {model.phase === 'preparing' ? 'Not started' : `${model.processed} / ${model.totalFiles} processed`}
          </span>
        </div>

        {model.phase === 'failed' && model.failMessage ? (
          <p className="kb-syncModal-errorBanner" role="alert">
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
          <div className="kb-syncModal-actions">
            <button type="button" className="kb-syncModal-primaryBtn" onClick={onDismiss}>
              Close
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
