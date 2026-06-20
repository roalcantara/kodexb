/**
 * Shared CLI helpers for spec audit / conform entrypoints.
 */
import { existsSync } from 'node:fs'
import path from 'node:path'
import { UsageError } from '@kb/exec'
import type { FixResult } from './audit_fix_core.script'
import { resolveAuditFeatureDir } from './resolve_active_feature_dir.script'

export type GovernanceOutputFlags = {
  json: boolean
  raw: boolean
}

export type GovernanceFixFlags = GovernanceOutputFlags & {
  featureDir: string
  dryRun: boolean
  force: boolean
}

export type GovernanceAuditFlags = GovernanceFixFlags & {
  strict: boolean
  fix: boolean
}

type FlagBag = GovernanceAuditFlags

function parseGovernanceArgs(argv: string[], mode: 'fix' | 'audit'): FlagBag {
  const flags: FlagBag = {
    featureDir: '',
    strict: false,
    fix: false,
    dryRun: false,
    force: false,
    json: false,
    raw: false
  }

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a) continue
    if (a === '--strict') {
      if (mode !== 'audit') throw new UsageError(`unknown flag: ${a}`)
      flags.strict = true
      continue
    }
    if (a === '--fix') {
      if (mode !== 'audit') throw new UsageError(`unknown flag: ${a}`)
      flags.fix = true
      continue
    }
    if (a === '--dry-run') {
      flags.dryRun = true
      continue
    }
    if (a === '--force') {
      flags.force = true
      continue
    }
    if (a === '--json') {
      flags.json = true
      continue
    }
    if (a === '--raw') {
      flags.raw = true
      continue
    }
    if (a.startsWith('-')) throw new UsageError(`unknown flag: ${a}`)
    if (!flags.featureDir) {
      flags.featureDir = a
      continue
    }
    throw new UsageError(`unexpected argument: ${a}`)
  }

  if (flags.json && flags.raw) throw new UsageError('--json and --raw are mutually exclusive')
  if (mode === 'audit' && flags.dryRun && !flags.fix) throw new UsageError('--dry-run requires --fix')
  return flags
}

export function parseGovernanceFixArgs(argv: string[]): GovernanceFixFlags {
  const flags = parseGovernanceArgs(argv, 'fix')
  return {
    featureDir: flags.featureDir,
    dryRun: flags.dryRun,
    force: flags.force,
    json: flags.json,
    raw: flags.raw
  }
}

export function parseGovernanceAuditArgs(argv: string[]): GovernanceAuditFlags {
  return parseGovernanceArgs(argv, 'audit')
}

export function resolveGovernanceFeatureDir(explicit?: string) {
  return resolveAuditFeatureDir(explicit?.trim() || undefined)
}

export type PreparedFeatureRun = { ok: true; resolvedDir: string } | { ok: false; exitCode: number; message: string }

export function prepareGovernanceFeatureRun(root: string, featureDir: string, verb: string): PreparedFeatureRun {
  const resolved = resolveGovernanceFeatureDir(featureDir)
  if (!resolved.ok) return { ok: false, exitCode: resolved.exitCode, message: resolved.message }
  const missing = requireFeatureSpecMd(root, resolved.featureDir, verb)
  if (missing) return { ok: false, exitCode: 2, message: missing }
  return { ok: true, resolvedDir: path.resolve(root, resolved.featureDir) }
}

export function requireFeatureSpecMd(root: string, featureDir: string, verb: string): string | null {
  const resolvedDir = path.resolve(root, featureDir)
  if (!existsSync(resolvedDir) || !existsSync(path.join(resolvedDir, 'spec.md'))) {
    return `${verb}: feature dir not found: ${resolvedDir} (must contain spec.md)`
  }
  return null
}

export function printFixPlanSummary(label: string, plan: FixResult, dryRun: boolean): void {
  if (plan.actions.length === 0 && plan.skipped.length === 0) return
  console.log(`\n── ${label} ${dryRun ? '(dry-run) ' : ''}──`)
  for (const action of plan.actions) {
    console.log(`  ${action.action.toUpperCase()} ${action.file}  [${action.rule}] ${action.summary}`)
  }
  for (const skip of plan.skipped) {
    console.log(`  SKIP [${skip.rule}] ${skip.reason}`)
  }
}

export function appendGovernanceSpawnFlags(argv: string[], env: Record<string, string | undefined>): void {
  if (env.usage_dry_run === 'true') argv.push('--dry-run')
  if (env.usage_force === 'true') argv.push('--force')
  if (env.usage_json === 'true') argv.push('--json')
  if (env.usage_raw === 'true') argv.push('--raw')
}
