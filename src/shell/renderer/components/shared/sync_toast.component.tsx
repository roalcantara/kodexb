import type { RpcImportResult } from '@shared/rpc'
import { useEffect, useState } from 'react'

const ERROR_TOAST_DELAY_MS = 8000
const SUCCESS_TOAST_DELAY_MS = 5000

type SyncToastProps = {
  result: RpcImportResult | null
  onDismiss: () => void
}

export function SyncToast({ result, onDismiss }: SyncToastProps) {
  const [showErrors, setShowErrors] = useState(false)

  useEffect(() => {
    if (!result) return
    setShowErrors(false)
    const delay = result.errors.length > 0 ? ERROR_TOAST_DELAY_MS : SUCCESS_TOAST_DELAY_MS
    const timer = setTimeout(onDismiss, delay)
    return () => clearTimeout(timer)
  }, [result, onDismiss])

  if (!result) return null

  const { filesProcessed, inserted, updated, errors } = result

  return (
    <div className="kb-syncToast">
      <div className="kb-syncToast-body">
        <span className="kb-syncToast-summary">
          {errors.length === 0
            ? `${filesProcessed} files: ${inserted} inserted, ${updated} updated`
            : `Sync completed with ${errors.length} error${errors.length === 1 ? '' : 's'}`}
        </span>
        {errors.length > 0 && (
          <button type="button" className="kb-syncToast-toggle" onClick={() => setShowErrors(!showErrors)}>
            View errors ({errors.length})
          </button>
        )}
      </div>
      {showErrors && errors.length > 0 && (
        <ul className="kb-syncToast-errors">
          {errors.map(err => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      )}
      <button type="button" className="kb-syncToast-close" onClick={onDismiss} aria-label="Dismiss">
        ✕
      </button>
    </div>
  )
}
