const MS_PER_SECOND = 1000
const MS_PER_MINUTE = 60 * MS_PER_SECOND
const MS_PER_HOUR = 60 * MS_PER_MINUTE
const MS_PER_DAY = 24 * MS_PER_HOUR
const FRECENCY_HALF_LIFE_DAYS = 7
const FRECENCY_DECAY_BASE = 0.5

/** Default half-life for visit decay (7 days). */
export const FRECENCY_HALF_LIFE_MS = FRECENCY_HALF_LIFE_DAYS * MS_PER_DAY

/** Score added on each visit after decaying the previous score. */
export const FRECENCY_BUMP_WEIGHT = 1

export type FrecencyState = {
  frecencyScore: number
  lastVisitedAt: number
  visitCount: number
}

/**
 * Raycast-style frecency bump: decay prior score by time since last visit, then add weight.
 * Pure — safe to call from shell with fixed `nowMs` in tests.
 */
export function bumpFrecency(
  previous: FrecencyState | null,
  nowMs: number,
  halfLifeMs: number = FRECENCY_HALF_LIFE_MS
): FrecencyState {
  if (previous === null) {
    return {
      frecencyScore: FRECENCY_BUMP_WEIGHT,
      lastVisitedAt: nowMs,
      visitCount: 1
    }
  }

  const elapsed = Math.max(0, nowMs - previous.lastVisitedAt)
  const decay = FRECENCY_DECAY_BASE ** (elapsed / halfLifeMs)
  return {
    frecencyScore: previous.frecencyScore * decay + FRECENCY_BUMP_WEIGHT,
    lastVisitedAt: nowMs,
    visitCount: previous.visitCount + 1
  }
}
