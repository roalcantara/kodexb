import { memo } from 'react'

export type SyncProgressProps = {
  processed: number
  total: number
}

function SyncProgressComponent({ processed, total }: SyncProgressProps) {
  return (
    <div className="kb-syncProgress">
      <progress className="kb-syncProgress-bar" value={processed} max={total} />
      <span className="kb-syncProgress-label">
        Processing file {processed} of {total}
      </span>
    </div>
  )
}

export const SyncProgress = memo(SyncProgressComponent)
