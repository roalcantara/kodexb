export type UtilVerdict = 'keep-util' | 'rename' | 'move'
export type UtilRow = { path: string; importsIO: boolean; verdict: UtilVerdict; suggestedSuffix?: string }
export type RoleMetrics = {
  totalUtil: number
  mislabeledUtilCount: number
  utilPurityRatio: number
  enforcedDirRatio: number
  suffixViolations: number
}

/**
 * Strips `import type ...` statements (single-line and multi-line) before I/O
 * scanning. MIGR-1 AC1: type-only imports MUST NOT count as runtime I/O.
 *
 * Handles:
 *   import type { X } from '...'   (single-line)
 *   import type {                  (multi-line)
 *     X,
 *     Y
 *   } from '...'
 *   import type * as N from '...'
 *   import type N from '...'
 */
const TYPE_IMPORT_RE = /^[ \t]*import\s+type\b[\s\S]*?from\s+['"][^'"]+['"];?[ \t]*$/gm

export function stripTypeImports(source: string): string {
  return source.replace(TYPE_IMPORT_RE, '')
}

/**
 * Runtime-I/O signature detector.
 *
 * MIGR-1 AC2 — flags only true runtime-I/O:
 *   - `node:fs`, `node:fs/promises`, `node:child_process`, `node:os`,
 *     `node:net`, `node:http`, `node:https`
 *   - value imports of `bun:sqlite` or `electrobun`
 *   - `Bun.$` template tag, `Bun.spawn`
 *   - `fetch(` calls
 *
 * Pure Node modules (`node:path`, `node:url`, `node:querystring`, `node:util`,
 * `node:assert`) are intentionally NOT matched.
 */
const IO_RE =
  /(?:from\s+|import\s+)['"](?:node:(?:fs(?:\/promises)?|child_process|os|net|https?)|bun:sqlite|electrobun)|Bun\.\$|Bun\.spawn|\bfetch\s*\(/

export function isPureUtil(source: string): boolean {
  return !IO_RE.test(stripTypeImports(source))
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
