import { readFileSync, statSync } from 'node:fs'
import { normalizeRepoPath } from '../file_selection.script'
import type { SecurityFinding } from '../security.types'
import { ENTROPY_MIN_BITS, ENTROPY_MIN_LENGTH, SECRETS_REGEX_RULES, shannonEntropy } from './secrets.rules.script'

function hasNulBytePrefix(content: Buffer): boolean {
  const sample = content.subarray(0, Math.min(content.length, 4096))
  return sample.includes(0)
}

function findEntropyCandidates(content: string): Array<{ value: string; index: number }> {
  const matches: Array<{ value: string; index: number }> = []
  const tokenRegex = /[A-Za-z0-9_-]{20,}/g
  for (const match of content.matchAll(tokenRegex)) {
    const value = match[0]
    const index = match.index ?? -1
    if (!value || index < 0) continue
    if (value.length < ENTROPY_MIN_LENGTH) continue
    if (shannonEntropy(value) >= ENTROPY_MIN_BITS) matches.push({ value, index })
  }
  return matches
}

function lineFromOffset(content: string, index: number): number {
  return content.slice(0, index).split('\n').length
}

export function runSecretsCheck(files: string[]): SecurityFinding[] {
  const findings: SecurityFinding[] = []

  const EXEMPT_PATHS = [
    'packages/ops/src/governance/security/fixtures/',
    'node_modules/',
    '.git/',
    '.electrobun-cache/',
    'assets/specs',
    'bun.lock',
    'bun.lockb',
    'package-lock.json',
    'electrobun.config',
    'assets/images/',
    'assets/icons/'
  ]

  for (const file of files) {
    const repoPath = normalizeRepoPath(file)
    if (EXEMPT_PATHS.some(p => repoPath.includes(p) || repoPath === p)) continue
    // Keep test scan coverage; rely on fixture/allowlist scoping for intentional test tokens

    const st = statSync(file, { throwIfNoEntry: false })
    if (!st?.isFile()) continue
    const MAX_SCAN_SIZE = 5 * 1024 * 1024
    if (st.size > MAX_SCAN_SIZE) continue // 5 MB limit

    const buf = readFileSync(file)
    if (hasNulBytePrefix(buf)) continue

    const content = buf.toString('utf8')

    for (const rule of SECRETS_REGEX_RULES) {
      for (const match of content.matchAll(rule.pattern)) {
        const value = match[0] ?? ''
        const at = match.index ?? 0
        findings.push({
          id: `secret:${rule.id}:${file}:${at}`,
          severity: 'critical',
          file,
          line: lineFromOffset(content, at),
          rule: rule.id,
          message: `Potential secret detected (length: ${value.length})`
        })
      }
    }

    if (!repoPath.endsWith('.md')) {
      for (const candidate of findEntropyCandidates(content)) {
        findings.push({
          id: `secret:entropy:${file}:${candidate.index}`,
          severity: 'critical',
          file,
          line: lineFromOffset(content, candidate.index),
          rule: 'high-entropy-string',
          message: `High entropy token detected (len>=${ENTROPY_MIN_LENGTH})`
        })
      }
    }
  }

  return findings
}
