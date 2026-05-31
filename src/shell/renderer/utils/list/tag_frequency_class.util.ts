export type TagFrequencyTier = 'rare' | 'modest' | 'common' | 'dominant'

const TAG_FREQ_DOMINANT_MIN = 500
const TAG_FREQ_COMMON_MIN = 100
const TAG_FREQ_MODEST_MIN = 25

export function tagFrequencyTier(count: number): TagFrequencyTier {
  if (count >= TAG_FREQ_DOMINANT_MIN) return 'dominant'
  if (count >= TAG_FREQ_COMMON_MIN) return 'common'
  if (count >= TAG_FREQ_MODEST_MIN) return 'modest'
  return 'rare'
}

export function tagFrequencyClassName(count: number): string {
  return `cmp-tag cmp-tag--freq-${tagFrequencyTier(count)}`
}
