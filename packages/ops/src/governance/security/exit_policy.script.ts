import type { SecuritySeverity } from './security.types'

export function exitCodeForFindings(severity: SecuritySeverity | null, strict: boolean): number {
  if (severity === 'critical' || severity === 'high') return 1
  if (severity === 'medium' && strict) return 1
  return 0
}
