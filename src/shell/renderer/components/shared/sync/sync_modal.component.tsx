import type { RpcImportResult, RpcSyncFileResult } from '@shared/rpc'
import type { CSSProperties, RefObject } from 'react'
import { OVERLAY_SHELL_WIDTH_PX } from '../primitives/overlay_shell_layout.const'
import { buildFileLogViews, type FileLogRowView } from './sync_modal_errors.util'
import { useSyncModalExpansion } from './use_sync_modal_expansion.hook'

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
  summaryErrors,
  expandedPath,
  setExpandedPath,
  logEndRef
}: {
  fileLog: RpcSyncFileResult[]
  summaryErrors: string[]
  expandedPath: string | null
  setExpandedPath: (path: string | null) => void
  logEndRef: RefObject<HTMLDivElement | null>
}) {
  const views = buildFileLogViews(fileLog, summaryErrors)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, path: string) => {
    if (e.key === 'ArrowRight' || e.key === 'Enter') {
      e.preventDefault()
      setExpandedPath(path)
    } else if (e.key === 'ArrowLeft' || e.key === 'Escape') {
      e.preventDefault()
      setExpandedPath(null)
    }
  }

  return (
    <div className="cmp-sync-modal-log" role="log" aria-live="polite" aria-relevant="additions">
      {views.map(view => (
        <div
          key={`${view.path}-${view.label}`}
          className={`cmp-sync-modal-file-row${view.hasIssues ? ' cmp-sync-modal-file-row--error' : ''}`}
        >
          {view.hasIssues ? (
            <button
              type="button"
              className="cmp-sync-modal-file-row--interactive"
              onClick={() => setExpandedPath(expandedPath === view.path ? null : view.path)}
              onKeyDown={e => handleKeyDown(e, view.path)}
              aria-expanded={expandedPath === view.path}
              aria-controls={`error-detail-${view.path.replace(/\//g, '-')}`}
            >
              <div className="cmp-sync-modal-file-main">
                <span className="cmp-sync-modal-file-name">{view.label}</span>
                <span className="cmp-sync-modal-file-stat">{fileSummary(view)}</span>
                <span
                  className={`cmp-sync-modal-chevron${expandedPath === view.path ? ' cmp-sync-modal-chevron--expanded' : ''}`}
                >
                  ▸
                </span>
              </div>
            </button>
          ) : (
            <div className="cmp-sync-modal-file-main">
              <span className="cmp-sync-modal-file-name">{view.label}</span>
              <span className="cmp-sync-modal-file-stat">{fileSummary(view)}</span>
            </div>
          )}
          {view.hasIssues && expandedPath === view.path ? (
            <pre id={`error-detail-${view.path.replace(/\//g, '-')}`} className="cmp-sync-modal-error-detail">
              {view.issues.join('\n')}
            </pre>
          ) : null}
        </div>
      ))}
      <div ref={logEndRef} />
    </div>
  )
}

function SyncModalSummary({ summary, fileLogViews }: { summary: RpcImportResult; fileLogViews: FileLogRowView[] }) {
  const importedCount = fileLogViews.filter(r => r.ok && !r.hasIssues).length
  const withErrorsCount = fileLogViews.filter(r => r.hasIssues).length

  return (
    <div className="cmp-sync-modal-summary">
      <h3 className="cmp-sync-modal-summary-title">Sync finished</h3>
      <div className="cmp-sync-modal-stats-strip">
        <span>
          Files processed: <strong>{summary.filesProcessed}</strong>
        </span>
        <span className="cmp-sync-modal-stats-dot">·</span>
        <span>
          Imported: <strong>{importedCount}</strong>
        </span>
        <span className="cmp-sync-modal-stats-dot">·</span>
        <span className={withErrorsCount > 0 ? 'cmp-sync-modal-stats-error-count' : ''}>
          With errors: <strong>{withErrorsCount}</strong>
        </span>
      </div>
      <div className="cmp-sync-modal-stats-rows">
        Rows inserted: {summary.inserted} · updated: {summary.updated}
      </div>
      {summary.warnings.length > 0 ? (
        <div className="cmp-sync-modal-summary-warnings">{summary.warnings.join(' · ')}</div>
      ) : null}
    </div>
  )
}

function SyncModalSourceHeader({ model }: { model: SyncModalModel }) {
  if (model.phase === 'preparing') {
    return <p className="cmp-sync-modal-muted">Reading source folder…</p>
  }

  return (
    <>
      <div className="cmp-sync-modal-path-block">
        <span className="cmp-sync-modal-label">Folder</span>
        <code className="cmp-sync-modal-path">{model.sourcesDir || '—'}</code>
      </div>
      <p className="cmp-sync-modal-count">
        <strong>{model.totalFiles}</strong> source file{model.totalFiles === 1 ? '' : 's'} to process
      </p>
    </>
  )
}

function SyncModalDialogBody({
  model,
  views,
  expandedPath,
  setExpandedPath,
  logEndRef,
  onDismiss
}: {
  model: SyncModalModel
  views: FileLogRowView[]
  expandedPath: string | null
  setExpandedPath: (path: string | null) => void
  logEndRef: RefObject<HTMLDivElement | null>
  onDismiss: () => void
}) {
  const totalBar = Math.max(1, model.totalFiles)
  const processedBar = model.phase === 'preparing' ? 0 : Math.min(model.processed, totalBar)
  const showDismiss = model.phase === 'done' || model.phase === 'failed'
  const showFileLog = model.phase === 'active' || model.phase === 'done'

  return (
    <>
      <SyncModalSourceHeader model={model} />

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

      {showFileLog ? (
        <SyncModalFileLog
          fileLog={model.fileLog}
          summaryErrors={model.summary?.errors ?? []}
          expandedPath={expandedPath}
          setExpandedPath={setExpandedPath}
          logEndRef={logEndRef}
        />
      ) : null}

      {model.phase === 'done' && model.summary ? (
        <SyncModalSummary summary={model.summary} fileLogViews={views} />
      ) : null}

      {showDismiss ? (
        <div className="cmp-sync-modal-actions">
          <button type="button" className="cmp-sync-modal-primary-btn" onClick={onDismiss}>
            Close
          </button>
        </div>
      ) : null}
    </>
  )
}

export function SyncModal({ model, onDismiss }: SyncModalProps) {
  const { expandedPath, setExpandedPath, views, logEndRef } = useSyncModalExpansion(model)

  if (!model.open) return null

  const modalStyle = { '--overlay-shell-width': `${OVERLAY_SHELL_WIDTH_PX}px` } as CSSProperties

  return (
    <div className="cmp-sync-modal-backdrop cmp-overlay-backdrop cmp-overlay-backdrop--centered" role="presentation">
      <div
        className="cmp-overlay-shell cmp-sync-modal"
        style={modalStyle}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cmp-sync-modal-title"
      >
        <h2 id="cmp-sync-modal-title" className="cmp-sync-modal-title">
          Sync sources
        </h2>
        <SyncModalDialogBody
          model={model}
          views={views}
          expandedPath={expandedPath}
          setExpandedPath={setExpandedPath}
          logEndRef={logEndRef}
          onDismiss={onDismiss}
        />
      </div>
    </div>
  )
}
