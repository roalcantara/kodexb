import { memo } from 'react'

export type SyncProgressProps = {
  processed: number
  total: number
}

function SyncProgressComponent({ processed, total }: SyncProgressProps) {
  const hasProgress = total > 0 && processed >= 0

  return (
    <div className="kb-syncProgress">
      {hasProgress ? (
        <progress className="kb-syncProgress-bar" value={processed} max={total} />
      ) : (
        <progress className="kb-syncProgress-bar kb-syncProgress-bar--indeterminate" />
      )}
      <span className="kb-syncProgress-label">
        {hasProgress ? `Processing file ${processed} of ${total}` : 'Syncing…'}
      </span>
    </div>
  )
}

export const SyncProgress = memo(SyncProgressComponent)
