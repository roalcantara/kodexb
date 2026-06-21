export type UtilVerdict = 'keep-util' | 'rename' | 'move'
export type UtilRow = { path: string; importsIO: boolean; verdict: UtilVerdict; suggestedSuffix?: string }
export type RoleMetrics = {
  totalUtil: number
  mislabeledUtilCount: number
  utilPurityRatio: number
  enforcedDirRatio: number
  suffixViolations: number
}

const IO_RE = /(?:from\s+)?['"](?:node:|bun:sqlite|electrobun)|Bun\.\$|\bfetch\s*\(/

export function isPureUtil(source: string): boolean {
  return !IO_RE.test(source)
}

export function classifyUtil(path: string, source: string): UtilRow {
  if (isPureUtil(source)) return { path, importsIO: false, verdict: 'keep-util' }
  return { path, importsIO: true, verdict: 'rename', suggestedSuffix: '.adapter' }
}

export function computeMetrics(rows: UtilRow[], enforced: { locked: number; roleDirs: number }): RoleMetrics {
  const totalUtil = rows.length
  const mislabeledUtilCount = rows.filter(r => r.verdict !== 'keep-util').length
  const ratio = (n: number, d: number) => (d === 0 ? 1 : +(n / d).toFixed(3))
  return {
    totalUtil,
    mislabeledUtilCount,
    utilPurityRatio: ratio(totalUtil - mislabeledUtilCount, totalUtil),
    enforcedDirRatio: ratio(enforced.locked, enforced.roleDirs),
    suffixViolations: mislabeledUtilCount
  }
}
