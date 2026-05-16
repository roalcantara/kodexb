/** 1–3 bars for list row frecency indicator (0 = hidden). */
export function frecencyDisplayTier(score: number, maxScoreInList: number): 0 | 1 | 2 | 3 {
  if (score <= 0) return 0
  if (maxScoreInList <= 0) return 1
  const ratio = score / maxScoreInList
  if (ratio >= 0.67) return 3
  if (ratio >= 0.34) return 2
  return 1
}
