export type SecuritySeverity = 'critical' | 'high' | 'medium' | 'low'

export type SecurityFinding = {
  id: string
  severity: SecuritySeverity
  file: string
  line?: number
  rule: string
  message: string
}

export type SecurityScanResult = {
  findings: SecurityFinding[]
  durationMs: number
}

export function maxSeverity(findings: SecurityFinding[]): SecuritySeverity | null {
  const rank: Record<SecuritySeverity, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1
  }

  let current: SecuritySeverity | null = null
  for (const finding of findings) {
    if (!current || rank[finding.severity] > rank[current]) current = finding.severity
  }
  return current
}
