#!/usr/bin/env bun
import { existsSync } from 'node:fs'
import path from 'node:path'
import { loadAllowlist } from './allowlist.loader.script.ts'
import { appendSecurityRunEvent } from './run_writer.script.ts'

type HandoffScrubArgs = {
  body: string
  featureDir: string | null
}

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

function parseArgs(argv: string[]): HandoffScrubArgs {
  let featureDir: string | null = null
  const bodyParts: string[] = []

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (!arg) continue
    if (arg === '--feature') {
      const next = argv[i + 1]
      if (!next || next.startsWith('-')) {
        throw new Error('--feature requires a non-flag argument')
      }
      featureDir = next
      i += 1
      continue
    }
    bodyParts.push(arg)
  }

  const body = bodyParts.join(' ').trim()
  return { body, featureDir }
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
    const excerpt = value.length > 32 ? `${value.slice(0, 12)}...${value.slice(-12)}` : value
    return { rule: pattern.rule, offset, excerpt, value }
  }

  return null
}

function loadAllowlistEntries(featureDir: string | null): string[] {
  if (!featureDir) return []
  const allowlistPath = path.join(featureDir, 'handoff-allowlist.yml')
  if (!existsSync(allowlistPath)) return []
  const allowlist = loadAllowlist(allowlistPath)
  return allowlist?.entries ?? []
}

export function scrubPrompt(body: string, featureDir: string | null = null): void {
  const allowlist = loadAllowlistEntries(featureDir)
  const violation = findViolation(body)
  if (!violation) return

  // Only exempt if the SPECIFIC offending value is allowlisted
  if (allowlist.some(entry => entry === violation.value)) return

  throw new HandoffScrubError(violation.rule, violation.offset, violation.excerpt)
}

function main(): number {
  const args = parseArgs(process.argv.slice(2))
  let exitCode = 0
  let severityMax: 'high' | null = null
  const emitRunEvent = (findingsCount: number) => {
    appendSecurityRunEvent(process.cwd(), `scrub-${Date.now()}`, {
      ts: new Date().toISOString(),
      phase: 'handoff-scrub',
      trigger: 'handoff-emit',
      findingsCount,
      severityMax,
      exitCode,
      durationMs: 0,
      feature: process.env.SPEC_FEATURE_SLUG ?? args.featureDir
    })
  }

  try {
    scrubPrompt(args.body, args.featureDir)
  } catch (error) {
    exitCode = 1
    severityMax = 'high'
    emitRunEvent(1)
    throw error
  }

  emitRunEvent(0)
  return 0
}

if (import.meta.main) process.exit(main())
