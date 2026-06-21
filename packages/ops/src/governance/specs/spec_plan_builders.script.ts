/**
 * Pure helpers for `mise run spec` dispatch planning (no subprocess I/O).
 */

import { usageFlag, usageOptString } from '../../support/lib/cli/usage_env.script'
import { resolveSpecFeatureDir } from './resolve_active_feature_dir.script'
import { appendGovernanceSpawnFlags } from './spec_governance_cli.script'

export const SPECS_ROOT = 'packages/ops/src/governance/specs'
export const WORKFLOW_ROOT = `${SPECS_ROOT}/workflow`

export type SpecEnv = Record<string, string | undefined>

export type SpecPlan =
  | { kind: 'spawn'; argv: string[]; env?: Record<string, string | undefined> }
  | {
      kind: 'runner'
      task: 'spec-gate' | 'spec-ready' | 'spec-closeout'
      featureDir: string
      json: boolean
      raw: boolean
    }
  | { kind: 'error'; message: string; exitCode: number }

export type SpecPlanDeps = { activeRun?: () => string | null }

export type PlanCtx = { rest: string[]; env: SpecEnv; deps: SpecPlanDeps }

export type PlannerFn = (ctx: PlanCtx) => SpecPlan

export type ResolvedFeature = { ok: true; featureDir: string } | { ok: false; plan: SpecPlan }

const USAGE_FLAG_TO_ARG: Record<string, string> = {
  strict: '--strict',
  json: '--json',
  raw: '--raw',
  fix: '--fix',
  dry_run: '--dry-run',
  force: '--force',
  changed_only: '--changed-only',
  verify: '--verify',
  dispatch: '--dispatch',
  subgraph: '--subgraph',
  source: '--source',
  index: '--index',
  full: '--full',
  refresh: '--refresh',
  record: '--record'
}

export function planError(message: string, exitCode: number): SpecPlan {
  return { kind: 'error', message, exitCode }
}

export function planSpawn(argv: string[], env?: Record<string, string | undefined>): SpecPlan {
  return env ? { kind: 'spawn', argv, env } : { kind: 'spawn', argv }
}

export function planRunner(
  task: 'spec-gate' | 'spec-ready' | 'spec-closeout',
  featureDir: string,
  env: SpecEnv
): SpecPlan {
  return {
    kind: 'runner',
    task,
    featureDir,
    json: usageFlag(env, 'json'),
    raw: usageFlag(env, 'raw')
  }
}

export function bunSpec(relativePath: string, ...tail: string[]): string[] {
  return ['bun', `${SPECS_ROOT}/${relativePath}`, ...tail]
}

export function bunPath(absoluteFromRepoRoot: string, ...tail: string[]): string[] {
  return ['bun', absoluteFromRepoRoot, ...tail]
}

export function bashSpec(relativePath: string, ...tail: string[]): string[] {
  return ['bash', `${SPECS_ROOT}/${relativePath}`, ...tail]
}

/** Positional `[feature]`: prefer mise's `usage_feature`, else the next raw positional. */
export function featureFrom(env: SpecEnv, rest: string[]): string {
  return (usageOptString(env, 'feature') ?? rest[0] ?? '').trim()
}

export function requireResolvedFeature(ctx: PlanCtx, positional?: string): ResolvedFeature {
  const resolved = resolveSpecFeatureDir({ positional: positional ?? featureFrom(ctx.env, ctx.rest) })
  if (!resolved.ok) {
    return { ok: false, plan: planError(resolved.message, resolved.exitCode) }
  }
  return { ok: true, featureDir: resolved.featureDir }
}

export function requireSub(rest: string[], expected: string, label: string): SpecPlan | { ok: true; tail: string[] } {
  const sub = rest[0] ?? ''
  if (sub !== expected) return planError(`spec ${label}: unknown action ${sub}`, 2)
  return { ok: true, tail: rest.slice(1) }
}

export function pushUsageFlags(argv: string[], env: SpecEnv, keys: string[]): void {
  for (const key of keys) {
    if (usageFlag(env, key)) {
      const flag = USAGE_FLAG_TO_ARG[key]
      if (flag) argv.push(flag)
    }
  }
}

export function planGovernanceFeatureSpawn(
  script: string,
  featurePath: string | undefined,
  env: SpecEnv,
  auditFlags?: { strict?: boolean; fix?: boolean }
): SpecPlan {
  const resolved = resolveSpecFeatureDir({ positional: featurePath })
  if (!resolved.ok) return planError(resolved.message, resolved.exitCode)
  const argv = bunSpec(script, resolved.featureDir)
  if (auditFlags?.strict) pushUsageFlags(argv, env, ['strict'])
  if (auditFlags?.fix) pushUsageFlags(argv, env, ['fix'])
  appendGovernanceSpawnFlags(argv, env)
  return planSpawn(argv)
}

export function planSddFeatureAudit(featurePath: string | undefined, env: SpecEnv): SpecPlan {
  return planGovernanceFeatureSpawn('audit.script.ts', featurePath, env, { strict: true, fix: true })
}
