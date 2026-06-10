#!/usr/bin/env bun
import { findActiveRun } from '@kb/workflow-runtime'
import {
  type ResolveResult,
  resolveActiveFeatureDir,
  resolveSpecFeatureDir
} from '../governance/specs/resolve_active_feature_dir.script.ts'
import { resolveCatalogKey } from '../governance/specs/resolve_catalog_key.script.ts'
import { runStepsAndPrint } from '../support/lib/cli/task_runner.script.ts'
/**
 * mise run spec — Spec Kit lint, trace, gate, legacy import (thin dispatch stub).
 */
import { chdirToRepoRoot } from '../support/lib/shared/repo_root.script.ts'
import { spawnInherit } from '../support/lib/shared/spawn_inherit.script.ts'

const SPECS = 'tools/governance/specs'
const WORKFLOW = `${SPECS}/workflow`

export const ALLOWED_WORKFLOW_NAMES = new Set(['orchestrated-handoff', 'resume', 'run'])

/**
 * Validate the positional workflow name passed to `mise run spec workflow <name>`.
 * Returns an error message string when the name is unknown, or `null` when the
 * name is acceptable. Empty string is accepted because usage clauses always pass
 * the argument (mise expands `<name>` even when the operator omits it); the
 * caller decides whether to fall back to a default.
 */
export function validateWorkflowName(name: string): string | null {
  if (name === '') return null
  if (ALLOWED_WORKFLOW_NAMES.has(name)) return null
  return `spec workflow: unknown workflow "${name}". Allowed: ${[...ALLOWED_WORKFLOW_NAMES].join(', ')}`
}

/** Resolve feature dir for `mise run spec gate` (explicit arg or active-feature inference). */
export function resolveSpecGateFeatureDir(explicitDir?: string): ResolveResult {
  return resolveActiveFeatureDir(explicitDir || undefined)
}

/**
 * Guard the mutually-exclusive global flags `--raw` / `--json` (review rule 00).
 * Returns an error message when both are set, else null.
 */
export function rawJsonConflict(raw: boolean, json: boolean): string | null {
  return raw && json ? 'spec: --raw and --json are mutually exclusive' : null
}

/**
 * Clean the environment of all `usage_*` variables.
 * This is used to avoid leaking `usage_*` variables into the subprocesses.
 */
function cleanEnv(): Record<string, string | undefined> {
  const env = { ...process.env }
  for (const key of Object.keys(env)) {
    if (key.startsWith('usage_')) {
      delete env[key]
    }
  }
  return env
}

/**
 * Spawn a command and return its exit code, or 1 on error.
 * This is used to avoid leaking `usage_*` variables into the subprocesses.
 */
function spawnExitCode(cmd: string[], root: string): number {
  return Bun.spawnSync(cmd, { cwd: root, stdout: 'inherit', stderr: 'inherit', env: cleanEnv() }).exitCode ?? 1
}

type Env = Record<string, string | undefined>

/** A resolved dispatch plan. `spawn` runs an argv; `runner` drives the task_runner; `error` aborts. */
export type SpecPlan =
  | { kind: 'spawn'; argv: string[] }
  | { kind: 'runner'; task: 'spec-gate' | 'spec-ready'; featureDir: string; json: boolean; raw: boolean }
  | { kind: 'error'; message: string; exitCode: number }

const isTrue = (env: Env, k: string): boolean => env[k] === 'true'

/** Positional `[feature]`: prefer mise's `usage_feature`, else the next raw positional. */
function featureFrom(env: Env, rest: string[]): string {
  return (env.usage_feature ?? rest[0] ?? '').trim()
}

/**
 * Pure dispatch planner — maps a subcommand + its positional `rest` + the
 * `usage_*` env into a downstream argv (or runner/error). No spawning, so every
 * branch (and global-flag propagation) is unit-testable. `deps.activeRun`
 * supplies the `workflow resume` fallback when no runId is given.
 */
export function planSpec(
  cmd: string,
  rest: string[],
  env: Env,
  deps: { activeRun?: () => string | null } = {}
): SpecPlan {
  const conflict = rawJsonConflict(isTrue(env, 'usage_raw'), isTrue(env, 'usage_json'))
  if (conflict) return { kind: 'error', message: conflict, exitCode: 2 }

  switch (cmd) {
    case 'lint': {
      const feature = featureFrom(env, rest)
      const argv = ['bun', `${SPECS}/lint.script.ts`, feature || '--all']
      if (isTrue(env, 'usage_strict')) argv.push('--strict')
      return { kind: 'spawn', argv }
    }
    case 'trace': {
      const feature = featureFrom(env, rest)
      const argv = ['bun', `${SPECS}/trace.script.ts`]
      if (feature) argv.push(feature)
      if (isTrue(env, 'usage_strict')) argv.push('--strict')
      return { kind: 'spawn', argv }
    }
    case 'gate': {
      const resolved = resolveSpecFeatureDir({ positional: featureFrom(env, rest) })
      if (!resolved.ok) return { kind: 'error', message: resolved.message, exitCode: resolved.exitCode }
      return {
        kind: 'runner',
        task: 'spec-gate',
        featureDir: resolved.featureDir,
        json: isTrue(env, 'usage_json'),
        raw: isTrue(env, 'usage_raw')
      }
    }
    case 'test': {
      const scope = (env.usage_scope ?? '').trim()
      const feature = (env.usage_feature ?? rest.find(a => a !== scope) ?? '').trim()
      const argv = ['bun', `${SPECS}/spec_test.script.ts`]
      if (scope) argv.push(scope)
      if (feature) argv.push(feature)
      return { kind: 'spawn', argv }
    }
    case 'init':
      return {
        kind: 'spawn',
        argv: ['bun', `${SPECS}/feature_init.script.ts`, '--id', env.usage_id ?? '', '--slug', env.usage_slug ?? '']
      }
    case 'worktree': {
      const sub = rest[0] ?? ''
      if (sub !== 'add') return { kind: 'error', message: `spec worktree: unknown action ${sub}`, exitCode: 2 }
      return { kind: 'spawn', argv: ['bash', `${SPECS}/worktree-add.sh`, featureFrom(env, rest.slice(1))] }
    }
    case 'opencode': {
      const sub = rest[0] ?? ''
      if (sub !== 'check') return { kind: 'error', message: `spec opencode: unknown action ${sub}`, exitCode: 2 }
      return { kind: 'spawn', argv: ['bash', `${SPECS}/opencode_check.sh`] }
    }
    case 'library': {
      const sub = rest[0] ?? ''
      if (sub !== 'manifest') return { kind: 'error', message: `spec library: unknown action ${sub}`, exitCode: 2 }
      const argv = ['bun', `${SPECS}/library_manifest.script.ts`]
      if (isTrue(env, 'usage_dry_run')) argv.push('--dry-run')
      if (isTrue(env, 'usage_verify')) argv.push('--verify')
      return { kind: 'spawn', argv }
    }
    case 'workflow':
      return planWorkflow(rest, env, deps)
    case 'audit':
      return planAudit(rest, env)
    case 'ready': {
      const resolved = resolveSpecFeatureDir({ positional: featureFrom(env, rest) })
      if (!resolved.ok) return { kind: 'error', message: resolved.message, exitCode: resolved.exitCode }
      const phaseNo = (env.usage_phase ?? '').trim()
      if (phaseNo) {
        return { kind: 'spawn', argv: ['bun', `${SPECS}/phase.script.ts`, resolved.featureDir, '--phase', phaseNo] }
      }
      return {
        kind: 'runner',
        task: 'spec-ready',
        featureDir: resolved.featureDir,
        json: isTrue(env, 'usage_json'),
        raw: isTrue(env, 'usage_raw')
      }
    }
    case 'review-handoff': {
      const action = (env.usage_action ?? rest[0] ?? '').trim()
      const argv = ['bun', `${WORKFLOW}/review_handoff.script.ts`, action]
      const feature = (env.usage_feature ?? rest.find(a => a !== action) ?? '').trim()
      if (feature) argv.push('--feature', feature)
      if (env.usage_handoff) argv.push('--handoff', env.usage_handoff)
      if (env.usage_base) argv.push('--base', env.usage_base)
      if (env.usage_head) argv.push('--head', env.usage_head)
      if (env.usage_focus) argv.push('--focus', env.usage_focus)
      if (isTrue(env, 'usage_json')) argv.push('--json')
      return { kind: 'spawn', argv: argv.filter(Boolean) }
    }
    default:
      return { kind: 'error', message: `spec: unknown action ${cmd}`, exitCode: 2 }
  }
}

function planWorkflow(rest: string[], env: Env, deps: { activeRun?: () => string | null }): SpecPlan {
  const sub = rest[0] ?? ''
  if (sub === 'handoff') {
    const hc = rest[1] ?? ''
    const feature = featureFrom(env, rest.slice(2))
    if (hc === 'generate') {
      const argv = ['bun', 'packages/workflow-runtime/src/handoff_generate.script.ts']
      if (feature) argv.push('--feature', feature)
      if (env.usage_focus) argv.push('--focus', env.usage_focus)
      if (env.usage_worker) argv.push('--worker', env.usage_worker)
      if (isTrue(env, 'usage_dispatch')) argv.push('--dispatch')
      if (isTrue(env, 'usage_dry_run')) argv.push('--dry-run')
      return { kind: 'spawn', argv }
    }
    if (hc === 'scrub') {
      const argv = ['bun', 'tools/governance/security/handoff_scrub.script.ts']
      if (feature) argv.push('--feature', feature)
      if (env.usage_body) argv.push(env.usage_body)
      return { kind: 'spawn', argv }
    }
    return { kind: 'error', message: `spec workflow handoff: unknown action ${hc}`, exitCode: 2 }
  }
  if (sub === 'runs') {
    const action = env.usage_action ?? rest[1] ?? ''
    const argv = ['bun', `${WORKFLOW}/runs_cli.script.ts`, action]
    if (env.usage_feature) argv.push('--feature', env.usage_feature)
    if (env.usage_runId) argv.push(env.usage_runId)
    return { kind: 'spawn', argv }
  }
  if (sub === 'resume') {
    const runId = env.usage_runId || (deps.activeRun ? deps.activeRun() : null)
    if (!runId) return { kind: 'error', message: 'spec workflow resume: no active runs', exitCode: 2 }
    const argv = ['bun', `${SPECS}/workflow_run.script.ts`, 'resume', '--run-id', runId]
    if (env.usage_answer) argv.push('--answer', env.usage_answer)
    if (env.usage_approve) argv.push('--approve', env.usage_approve)
    return { kind: 'spawn', argv }
  }
  if (sub === 'bench') {
    return { kind: 'spawn', argv: ['bun', 'tools/metrics/harnesses/perf/perf.script.ts', 'workflow-observability'] }
  }
  // `run` (default): positional [feature], no --feat/--feature.
  const feature = featureFrom(env, sub === 'run' ? rest.slice(1) : rest)
  const argv = ['bun', `${SPECS}/workflow_run.script.ts`, 'orchestrated-handoff']
  if (feature) argv.push('--feature', feature)
  if (isTrue(env, 'usage_dry_run')) argv.push('--dry-run')
  return { kind: 'spawn', argv }
}

function planAudit(rest: string[], env: Env): SpecPlan {
  const sub = rest[0] ?? ''
  if (sub === 'docs') {
    if ((rest[1] ?? '') !== 'rogue-refs')
      return { kind: 'error', message: `spec audit docs: unknown action ${rest[1] ?? ''}`, exitCode: 2 }
    return { kind: 'spawn', argv: ['bun', 'tools/bin/audit.script.ts', 'rogue-refs'] }
  }
  if (sub === 'feature') {
    const resolved = resolveSpecFeatureDir({ positional: env.usage_feature ?? rest[1] })
    if (!resolved.ok) return { kind: 'error', message: resolved.message, exitCode: resolved.exitCode }
    const argv = ['bun', `${SPECS}/audit.script.ts`, resolved.featureDir]
    if (isTrue(env, 'usage_strict')) argv.push('--strict')
    if (isTrue(env, 'usage_json')) argv.push('--json') // global flag
    if (isTrue(env, 'usage_raw')) argv.push('--raw') // global flag
    return { kind: 'spawn', argv }
  }
  if (sub === 'security') {
    const argv = ['bun', 'tools/governance/security/scan.script.ts']
    if (isTrue(env, 'usage_strict')) argv.push('--strict')
    if (isTrue(env, 'usage_changed_only')) argv.push('--changed-only')
    if (env.usage_base) argv.push('--base', env.usage_base)
    return { kind: 'spawn', argv }
  }
  return { kind: 'error', message: `spec audit: unknown action ${sub}`, exitCode: 2 }
}

function runGateOrReady(plan: Extract<SpecPlan, { kind: 'runner' }>, root: string): never {
  const dir = plan.featureDir
  const steps =
    plan.task === 'spec-gate'
      ? [{ id: 'gate', title: `spec gate ${dir}`, run: () => spawnExitCode(['bash', `${SPECS}/gate.sh`, dir], root) }]
      : (() => {
          const keyResult = resolveCatalogKey(dir)
          const key = process.env.usage_key || keyResult.key
          if (!keyResult.ok && keyResult.warning) console.error(keyResult.warning)
          const s = [] as { id: string; title: string; run: () => number }[]
          if (key)
            s.push({
              id: 'tag',
              title: `tag test ${key}`,
              run: () => spawnExitCode(['mise', 'run', 'test', 'tag', key], root)
            })
          s.push({
            id: 'catalog',
            title: 'catalog validate',
            run: () => spawnExitCode(['mise', 'run', 'catalog', 'validate', '--raw'], root)
          })
          s.push({
            id: 'hk',
            title: 'hk check profile commit',
            run: () => spawnExitCode(['hk', 'check', '--profile', 'commit'], root)
          })
          s.push({
            id: 'gate',
            title: `spec gate ${dir}`,
            run: () => spawnExitCode(['bash', `${SPECS}/gate.sh`, dir], root)
          })
          return s
        })()
  const report = runStepsAndPrint(
    { task: plan.task, command: `mise run ${plan.task.replace('spec-', 'spec ')} ${dir}`, steps },
    { json: plan.json, raw: plan.raw }
  )
  process.exit(report.ok ? 0 : 1)
}

function main(): void {
  const root = chdirToRepoRoot()
  const args = process.argv.slice(2)
  const rawCmd = (process.env.usage_cmd ?? '').trim()
  if (rawCmd) args.unshift(...rawCmd.split(' '))
  const cmd = args.shift() ?? ''
  if (!cmd) {
    console.error('spec: missing subcommand')
    process.exit(2)
  }

  const plan = planSpec(cmd, args, process.env, { activeRun: () => findActiveRun() })
  if (plan.kind === 'error') {
    console.error(plan.message)
    process.exit(plan.exitCode)
  }
  if (plan.kind === 'runner') runGateOrReady(plan, root)
  spawnInherit(plan.argv, root)
}

if (import.meta.main) main()
