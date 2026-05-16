const FRECENCY_TIER_HIGH_RATIO = 0.67
const FRECENCY_TIER_MID_RATIO = 0.34
const FRECENCY_TIER_HIGH = 3
const FRECENCY_TIER_MID = 2
const FRECENCY_TIER_LOW = 1

/** 1–3 bars for list row frecency indicator (0 = hidden). */
export function frecencyDisplayTier(score: number, maxScoreInList: number): 0 | 1 | 2 | 3 {
  if (score <= 0) return 0
  if (maxScoreInList <= 0) return FRECENCY_TIER_LOW
  const ratio = score / maxScoreInList
  if (ratio >= FRECENCY_TIER_HIGH_RATIO) return FRECENCY_TIER_HIGH
  if (ratio >= FRECENCY_TIER_MID_RATIO) return FRECENCY_TIER_MID
  return FRECENCY_TIER_LOW
}
