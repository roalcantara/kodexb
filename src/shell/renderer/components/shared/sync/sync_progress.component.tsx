import { memo } from 'react'

export type SyncProgressProps = {
  processed: number
  total: number
}

function SyncProgressComponent({ processed, total }: SyncProgressProps) {
  const hasProgress = total > 0 && processed >= 0

  return (
    <div className="cmp-sync-progress">
      {hasProgress ? (
        <progress className="cmp-sync-progress-bar" value={processed} max={total} />
      ) : (
        <progress className="cmp-sync-progress-bar cmp-sync-progress-bar--indeterminate" />
      )}
      <span className="cmp-sync-progress-label">
        {hasProgress ? `Processing file ${processed} of ${total}` : 'Syncing…'}
      </span>
    </div>
  )
}

export const SyncProgress = memo(SyncProgressComponent)
