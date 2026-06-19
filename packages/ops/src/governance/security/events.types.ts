import type { SecuritySeverity } from './security.types'

export type SecurityRunPhase = 'scan' | 'handoff-scrub'
export type SecurityRunTrigger = 'hk' | 'gate' | 'ci' | 'handoff-emit'

export type SecurityRunEvent = {
  ts: string
  phase: SecurityRunPhase
  trigger: SecurityRunTrigger
  findingsCount: number
  severityMax: SecuritySeverity | null
  exitCode: number
  durationMs: number
  feature: string | null
}
