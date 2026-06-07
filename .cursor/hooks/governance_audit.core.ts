import { appendFileSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export type GovernanceLevel = 'open' | 'standard' | 'strict' | 'locked'

export type ThreatCategory =
  | 'data_exfiltration'
  | 'privilege_escalation'
  | 'system_destruction'
  | 'prompt_injection'
  | 'credential_exposure'

export interface ThreatPattern {
  pattern: RegExp
  category: ThreatCategory
  severity: number
  description: string
}

export interface ThreatMatch {
  category: ThreatCategory
  severity: number
  description: string
  evidence: string
}

export interface GovernanceConfig {
  skip: boolean
  level: GovernanceLevel
  blockOnThreat: boolean
  logDir: string
  auditLogPath: string
  sessionsDir: string
}

export interface SessionState {
  sessionId: string
  startedAt: string
  governanceLevel: GovernanceLevel
  cwd: string
  eventCount: number
  threatCount: number
}

const DEFAULT_LOG_DIR = join(process.cwd(), 'tmp', 'agent-governance')

const THREAT_PATTERNS: ThreatPattern[] = [
  {
    pattern: /send\s+(all|every|entire)\s+\w+\s+to\s+/i,
    category: 'data_exfiltration',
    severity: 0.8,
    description: 'Bulk data transfer',
  },
  {
    pattern: /export\s+.*\s+to\s+(external|outside|third[_-]?party)/i,
    category: 'data_exfiltration',
    severity: 0.9,
    description: 'External export',
  },
  {
    pattern: /curl\s+.*\s+-d\s+/i,
    category: 'data_exfiltration',
    severity: 0.7,
    description: 'HTTP POST with data',
  },
  {
    pattern: /upload\s+.*\s+(credentials|secrets|keys)/i,
    category: 'data_exfiltration',
    severity: 0.95,
    description: 'Credential upload',
  },
  {
    pattern: /(sudo|as\s+root|admin\s+access|runas\s+\/user)/i,
    category: 'privilege_escalation',
    severity: 0.8,
    description: 'Elevated privileges',
  },
  {
    pattern: /chmod\s+777/i,
    category: 'privilege_escalation',
    severity: 0.9,
    description: 'World-writable permissions',
  },
  {
    pattern: /add\s+.*\s+(sudoers|administrators)/i,
    category: 'privilege_escalation',
    severity: 0.95,
    description: 'Adding admin access',
  },
  {
    pattern: /(rm\s+-rf\s+\/|del\s+\/[sq]|format\s+c:)/i,
    category: 'system_destruction',
    severity: 0.95,
    description: 'Destructive command',
  },
  {
    pattern: /(drop\s+database|truncate\s+table|delete\s+from\s+\w+\s*(;|\s*$))/i,
    category: 'system_destruction',
    severity: 0.9,
    description: 'Database destruction',
  },
  {
    pattern: /wipe\s+(all|entire|every)/i,
    category: 'system_destruction',
    severity: 0.9,
    description: 'Mass deletion',
  },
  {
    pattern: /ignore\s+(previous|above|all)\s+(instructions?|rules?|prompts?)/i,
    category: 'prompt_injection',
    severity: 0.9,
    description: 'Instruction override',
  },
  {
    pattern: /you\s+are\s+now\s+(a|an)\s+(assistant|ai|bot|system|expert|language\s+model)\b/i,
    category: 'prompt_injection',
    severity: 0.7,
    description: 'Role reassignment',
  },
  {
    pattern: /(?:^|\n)\s*system\s*:\s*you\s+are/i,
    category: 'prompt_injection',
    severity: 0.6,
    description: 'System prompt injection',
  },
  {
    pattern: /(api[_-]?key|secret[_-]?key|password|token)\s*[:=]\s*['"]?\w{8,}/i,
    category: 'credential_exposure',
    severity: 0.9,
    description: 'Possible hardcoded credential',
  },
  {
    pattern: /(aws_access_key|AKIA[0-9A-Z]{16})/i,
    category: 'credential_exposure',
    severity: 0.95,
    description: 'AWS key exposure',
  },
]

export function loadConfig(env: NodeJS.ProcessEnv = process.env): GovernanceConfig {
  const logDir = env.GOVERNANCE_AUDIT_LOG_DIR?.trim() || DEFAULT_LOG_DIR
  return {
    skip: env.SKIP_GOVERNANCE_AUDIT === 'true',
    level: parseGovernanceLevel(env.GOVERNANCE_LEVEL),
    blockOnThreat: env.BLOCK_ON_THREAT === 'true',
    logDir,
    auditLogPath: join(logDir, 'audit.ndjson'),
    sessionsDir: join(logDir, 'sessions'),
  }
}

export function parseGovernanceLevel(value: string | undefined): GovernanceLevel {
  const normalized = value?.trim()
  switch (normalized) {
    case 'open':
    case 'standard':
    case 'strict':
    case 'locked':
      return normalized
    default:
      return 'standard'
  }
}

export function extractPromptFromInput(input: unknown): string {
  if (typeof input === 'string') {
    return input
  }
  if (input && typeof input === 'object') {
    const record = input as Record<string, unknown>
    if (typeof record.prompt === 'string') {
      return record.prompt
    }
    if (typeof record.userMessage === 'string') {
      return record.userMessage
    }
  }
  return ''
}

export function extractSessionId(input: unknown): string | undefined {
  if (!input || typeof input !== 'object') {
    return undefined
  }
  const record = input as Record<string, unknown>
  if (typeof record.session_id === 'string' && record.session_id.length > 0) {
    return record.session_id
  }
  if (typeof record.conversation_id === 'string' && record.conversation_id.length > 0) {
    return record.conversation_id
  }
  return undefined
}

export function scanPrompt(prompt: string): ThreatMatch[] {
  const matches: ThreatMatch[] = []
  const seen = new Set<string>()

  for (const rule of THREAT_PATTERNS) {
    const match = rule.pattern.exec(prompt)
    if (!match) {
      continue
    }
    const key = `${rule.category}:${match[0]}`
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    matches.push({
      category: rule.category,
      severity: rule.severity,
      description: rule.description,
      evidence: rule.category === 'credential_exposure' ? '<REDACTED_CREDENTIAL>' : redactEvidence(match[0]),
    })
  }

  return matches.sort((left, right) => right.severity - left.severity)
}

export function shouldBlockThreats(config: GovernanceConfig, threatCount: number): boolean {
  if (threatCount === 0) {
    return false
  }
  if (config.level === 'open') {
    return false
  }
  if (config.level === 'strict' || config.level === 'locked') {
    return true
  }
  return config.blockOnThreat
}

export function maxSeverity(threats: ThreatMatch[]): number {
  return threats.reduce((max, threat) => Math.max(max, threat.severity), 0)
}

export function ensureLogDirs(config: GovernanceConfig): void {
  mkdirSync(config.sessionsDir, { recursive: true })
}

export function appendAuditEvent(config: GovernanceConfig, event: Record<string, unknown>): void {
  ensureLogDirs(config)
  appendFileSync(config.auditLogPath, `${JSON.stringify(event)}\n`, 'utf8')
}

export function sessionStatePath(config: GovernanceConfig, sessionId: string): string {
  return join(config.sessionsDir, `${sessionId}.json`)
}

export function readSessionState(config: GovernanceConfig, sessionId: string): SessionState | undefined {
  const path = sessionStatePath(config, sessionId)
  if (!existsSync(path)) {
    return undefined
  }
  return JSON.parse(readFileSync(path, 'utf8')) as SessionState
}

export function writeSessionState(config: GovernanceConfig, state: SessionState): void {
  ensureLogDirs(config)
  writeFileSync(sessionStatePath(config, state.sessionId), `${JSON.stringify(state)}\n`, 'utf8')
}

export function deleteSessionState(config: GovernanceConfig, sessionId: string): void {
  const path = sessionStatePath(config, sessionId)
  if (existsSync(path)) {
    unlinkSync(path)
  }
}

export async function readHookInput(): Promise<unknown> {
  const raw = await Bun.stdin.text()
  if (raw.trim().length === 0) {
    return {}
  }
  return JSON.parse(raw)
}

export function utcTimestamp(date = new Date()): string {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

function redactEvidence(evidence: string): string {
  const trimmed = evidence.trim()
  if (trimmed.length <= 80) {
    return trimmed
  }
  return `${trimmed.slice(0, 77)}...`
}
