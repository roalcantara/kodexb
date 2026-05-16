import { frecencyDisplayTier } from '../../utils/list/frecency_tier.util'

const FRECENCY_BAR_COUNT = 3

export type EntryRowFrecencyIndicatorProps = {
  frecencyScore: number
  visitCount: number
  maxFrecencyScore: number
}

export function EntryRowFrecencyIndicator({
  frecencyScore,
  visitCount,
  maxFrecencyScore
}: EntryRowFrecencyIndicatorProps) {
  const tier = frecencyDisplayTier(frecencyScore, maxFrecencyScore)
  if (tier === 0) return null

  const label = visitCount === 1 ? 'Used once' : `Used ${visitCount} times`

  return (
    <span className="kb-pt-frecency" title={label} role="img" aria-label={label}>
      {Array.from({ length: FRECENCY_BAR_COUNT }, (_, i) => {
        const barKey = `frecency-bar-${i + 1}`
        return (
          <span
            key={barKey}
            className={i < tier ? 'kb-pt-frecency-bar kb-pt-frecency-bar--on' : 'kb-pt-frecency-bar'}
            aria-hidden
          />
        )
      })}
    </span>
  )
}
