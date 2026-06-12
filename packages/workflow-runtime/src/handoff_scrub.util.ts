import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { validateAllowlistShape } from './handoff_allowlist.util'

/** Handoff prompt scrub (mirrors tools/governance/security/handoff_scrub.script). */

const EXCERPT_MAX_LEN = 32
const EXCERPT_HEAD_LEN = 12
const EXCERPT_TAIL_LEN = 12

export class HandoffScrubError extends Error {
  constructor(
    readonly rule: string,
    readonly offset: number,
    readonly _excerpt: string
  ) {
    super(`handoff scrub failed (${rule}) at byte ${offset}: <redacted>`)
    this.name = 'HandoffScrubError'
  }
}

function loadAllowlistEntries(featureDir: string | null): string[] {
  if (!featureDir) return []
  const allowlistPath = path.join(featureDir, 'handoff-allowlist.yml')
  if (!existsSync(allowlistPath)) return []
  const text = readFileSync(allowlistPath, 'utf8')
  const parsed = Bun.YAML.parse(text)
  return validateAllowlistShape(parsed).entries
}

function findViolation(body: string): { rule: string; offset: number; excerpt: string; value: string } | null {
  const patterns: Array<{ rule: string; re: RegExp }> = [
    { rule: 'secret-pattern', re: /gh[pousr]_[A-Za-z0-9]{20,}/g },
    { rule: 'absolute-path', re: /\/(Users|home|etc|var)\/[A-Za-z0-9_./-]+/g },
    { rule: 'env-literal', re: /(process\.env\.[A-Z0-9_]+|Bun\.env\.[A-Z0-9_]+|\$[A-Z_][A-Z0-9_]*)/g }
  ]

  for (const pattern of patterns) {
    const match = body.match(pattern.re)
    if (!match?.[0]) continue
    const value = match[0]
    const offset = body.indexOf(value)
    const excerpt =
      value.length > EXCERPT_MAX_LEN ? `${value.slice(0, EXCERPT_HEAD_LEN)}...${value.slice(-EXCERPT_TAIL_LEN)}` : value
    return { rule: pattern.rule, offset, excerpt, value }
  }

  return null
}

export function scrubPrompt(body: string, featureDir: string | null = null): void {
  const allowlist = loadAllowlistEntries(featureDir)
  const violation = findViolation(body)
  if (!violation) return

  if (allowlist.some(entry => entry === violation.value)) return

  throw new HandoffScrubError(violation.rule, violation.offset, violation.excerpt)
}
