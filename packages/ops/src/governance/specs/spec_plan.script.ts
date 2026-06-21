/**
 * Pure dispatch planner for `mise run spec` — maps subcommand + usage env to argv/runner plans.
 */

import {
  copyUsageToChild,
  rawJsonConflict,
  stripUsageEnv,
  usageFlag,
  usageOptString
} from '../../support/lib/cli/usage_env.script'
import { resolveSpecFeatureDir } from './resolve_active_feature_dir.script'
import {
  bashSpec,
  bunPath,
  bunSpec,
  featureFrom,
  type PlanCtx,
  type PlannerFn,
  planError,
  planGovernanceFeatureSpawn,
  planRunner,
  planSddFeatureAudit,
  planSpawn,
  pushUsageFlags,
  requireSub,
  type SpecEnv,
  type SpecPlan,
  type SpecPlanDeps,
  WORKFLOW_ROOT
} from './spec_plan_builders.script'

export { resolveSpecGateFeatureDir } from './spec_gate_feature_dir.script'
export type { PlanCtx, PlannerFn, SpecEnv, SpecPlan, SpecPlanDeps } from './spec_plan_builders.script'
export { planGovernanceFeatureSpawn, planSddFeatureAudit } from './spec_plan_builders.script'

export const ALLOWED_WORKFLOW_NAMES = new Set(['orchestrated-handoff', 'resume', 'run', 'status'])

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

function resolveFeatureOrError(
  env: SpecEnv,
  rest: string[]
): { ok: true; featureDir: string } | { ok: false; plan: SpecPlan } {
  const resolved = resolveSpecFeatureDir({ positional: featureFrom(env, rest) })
  if (!resolved.ok) return { ok: false, plan: planError(resolved.message, resolved.exitCode) }
  return { ok: true, featureDir: resolved.featureDir }
}

function planLint({ rest, env }: PlanCtx): SpecPlan {
  const feature = featureFrom(env, rest)
  const argv = bunSpec('lint.script.ts', feature || '--all')
  pushUsageFlags(argv, env, ['strict'])
  return planSpawn(argv)
}

function planTrace({ rest, env }: PlanCtx): SpecPlan {
  const feature = featureFrom(env, rest)
  const argv = bunSpec('trace.script.ts')
  if (feature) argv.push(feature)
  pushUsageFlags(argv, env, ['strict'])
  return planSpawn(argv)
}

function planGate(ctx: PlanCtx): SpecPlan {
  const resolved = resolveFeatureOrError(ctx.env, ctx.rest)
  if (!resolved.ok) return resolved.plan
  return planRunner('spec-gate', resolved.featureDir, ctx.env)
}

function planTest({ rest, env }: PlanCtx): SpecPlan {
  const scope = (usageOptString(env, 'scope') ?? '').trim()
  const feature = (usageOptString(env, 'feature') ?? rest.find(a => a !== scope) ?? '').trim()
  const argv = bunSpec('spec_test.script.ts')
  if (scope) argv.push(scope)
  if (feature) argv.push(feature)
  return planSpawn(argv)
}

function planInit({ env }: PlanCtx): SpecPlan {
  return planSpawn(bunSpec('feature_init.script.ts', '--id', env.usage_id ?? '', '--slug', env.usage_slug ?? ''))
}

function planWorktree(ctx: PlanCtx): SpecPlan {
  const subResult = requireSub(ctx.rest, 'add', 'worktree')
  if (!('ok' in subResult) || !subResult.ok) return subResult as SpecPlan
  return planSpawn(bashSpec('worktree-add.sh', featureFrom(ctx.env, subResult.tail)))
}

function planOpencode(ctx: PlanCtx): SpecPlan {
  const subResult = requireSub(ctx.rest, 'check', 'opencode')
  if (!('ok' in subResult) || !subResult.ok) return subResult as SpecPlan
  return planSpawn(bashSpec('opencode_check.sh'))
}

function planLibrary({ rest, env }: PlanCtx): SpecPlan {
  const sub = rest[0] ?? ''
  if (sub !== 'manifest') return planError(`spec library: unknown action ${sub}`, 2)
  const argv = bunSpec('library_manifest.script.ts')
  pushUsageFlags(argv, env, ['dry_run', 'verify'])
  return planSpawn(argv)
}

function planWorkflowHandoffGenerate(ctx: PlanCtx, feature: string): SpecPlan {
  const argv = bunPath('packages/exec/src/kit_verbs/handoff_generate.script.ts')
  if (feature) argv.push('--feature', feature)
  if (ctx.env.usage_focus) argv.push('--focus', ctx.env.usage_focus)
  if (ctx.env.usage_worker) argv.push('--worker', ctx.env.usage_worker)
  pushUsageFlags(argv, ctx.env, ['dispatch', 'dry_run'])
  return planSpawn(argv)
}

function planWorkflowHandoffScrub(ctx: PlanCtx, feature: string): SpecPlan {
  const argv = bunPath('packages/ops/src/governance/security/handoff_scrub.script.ts')
  if (feature) argv.push('--feature', feature)
  if (ctx.env.usage_body) argv.push(ctx.env.usage_body)
  return planSpawn(argv)
}

function planWorkflowHandoff(ctx: PlanCtx): SpecPlan {
  const hc = ctx.rest[1] ?? ''
  const feature = featureFrom(ctx.env, ctx.rest.slice(2))
  if (hc === 'generate') return planWorkflowHandoffGenerate(ctx, feature)
  if (hc === 'scrub') return planWorkflowHandoffScrub(ctx, feature)
  return planError(`spec workflow handoff: unknown action ${hc}`, 2)
}

function planWorkflowRuns({ rest, env }: PlanCtx): SpecPlan {
  const action = usageOptString(env, 'action') ?? rest[1] ?? ''
  const argv = ['bun', `${WORKFLOW_ROOT}/runs_cli.script.ts`, action]
  if (env.usage_feature) argv.push('--feature', env.usage_feature)
  if (env.usage_runId) argv.push(env.usage_runId)
  return planSpawn(argv)
}

function planWorkflowResume({ env, deps }: PlanCtx): SpecPlan {
  const runId = usageOptString(env, 'runId') || (deps.activeRun ? deps.activeRun() : null)
  if (!runId) return planError('spec workflow resume: no active runs', 2)
  const argv = bunSpec('workflow_run.script.ts', 'resume', '--run-id', runId)
  if (env.usage_answer) argv.push('--answer', env.usage_answer)
  if (env.usage_approve) argv.push('--approve', env.usage_approve)
  return planSpawn(argv)
}

function planWorkflowBench(): SpecPlan {
  return planSpawn(bunPath('packages/ops/src/metrics/harnesses/perf/perf.script.ts', 'workflow-observability'))
}

function planWorkflowKitNext(ctx: PlanCtx, restSlice: string[]): SpecPlan {
  const feature = featureFrom(ctx.env, restSlice)
  const argv = bunPath('packages/ops/src/bin/spec_kit.script.ts', 'next')
  if (feature) argv.push(feature)
  if (usageFlag(ctx.env, 'dry_run')) {
    argv.push('--dry-run')
    return planSpawn(argv)
  }
  argv.push('--loop')
  return planSpawn(argv)
}

function planWorkflowRun(ctx: PlanCtx): SpecPlan {
  return planWorkflowKitNext(ctx, ctx.rest.slice(1))
}

function planWorkflowDefault(ctx: PlanCtx): SpecPlan {
  const sub = ctx.rest[0] ?? ''
  return planWorkflowKitNext(ctx, sub === 'run' ? ctx.rest.slice(1) : ctx.rest)
}

function planWorkflowStatus(ctx: PlanCtx): SpecPlan {
  const feature = featureFrom(ctx.env, ctx.rest.slice(1))
  const argv = bunSpec('workflow_status.script.ts')
  if (feature) argv.push(feature)
  const format = usageOptString(ctx.env, 'format')
  if (format && format !== 'pretty') argv.push('--format', format)
  const output = usageOptString(ctx.env, 'output')
  if (output) argv.push('-o', output)
  const listSlug = usageOptString(ctx.env, 'list')
  if (listSlug) argv.push('--list', listSlug)
  const compareA = usageOptString(ctx.env, 'compare_a')
  const compareB = usageOptString(ctx.env, 'compare_b')
  if (compareA && compareB) argv.push('--compare', compareA, compareB)
  pushUsageFlags(argv, ctx.env, ['json', 'raw', 'subgraph', 'source', 'index', 'full', 'refresh', 'record'])
  return planSpawn(argv)
}

const WORKFLOW_ACTIONS = {
  handoff: planWorkflowHandoff,
  runs: planWorkflowRuns,
  resume: planWorkflowResume,
  bench: planWorkflowBench,
  run: planWorkflowRun,
  status: planWorkflowStatus
} as const satisfies Record<string, PlannerFn>

function planWorkflow(ctx: PlanCtx): SpecPlan {
  const sub = ctx.rest[0] ?? ''
  const handler = WORKFLOW_ACTIONS[sub as keyof typeof WORKFLOW_ACTIONS]
  if (handler) return handler(ctx)
  return planWorkflowDefault(ctx)
}

function planAuditFeature({ rest, env }: PlanCtx): SpecPlan {
  return planSddFeatureAudit(usageOptString(env, 'feature') ?? rest[1], env)
}

function planAuditSecurity({ env }: PlanCtx): SpecPlan {
  const argv = bunPath('packages/ops/src/governance/security/scan.script.ts')
  pushUsageFlags(argv, env, ['changed_only', 'strict'])
  if (env.usage_base) argv.push('--base', env.usage_base)
  return planSpawn(argv)
}

const AUDIT_SUBCOMMANDS = new Set(['feature', 'security'])

const AUDIT_ACTIONS = {
  feature: planAuditFeature,
  security: planAuditSecurity
} as const satisfies Record<string, PlannerFn>

function planAudit(ctx: PlanCtx): SpecPlan {
  const sub = ctx.rest[0] ?? ''
  if (AUDIT_SUBCOMMANDS.has(sub)) {
    const handler = AUDIT_ACTIONS[sub as keyof typeof AUDIT_ACTIONS]
    return handler(ctx)
  }
  const featurePath = sub && !sub.startsWith('-') ? sub : featureFrom(ctx.env, ctx.rest)
  return planSddFeatureAudit(featurePath || undefined, ctx.env)
}

function planConform({ rest, env }: PlanCtx): SpecPlan {
  const featurePath = featureFrom(env, rest)
  return planGovernanceFeatureSpawn('conform.script.ts', featurePath || undefined, env)
}

function planReady(ctx: PlanCtx): SpecPlan {
  const resolved = resolveFeatureOrError(ctx.env, ctx.rest)
  if (!resolved.ok) return resolved.plan
  const phaseNo = (usageOptString(ctx.env, 'phase') ?? '').trim()
  const commitRaw = (usageOptString(ctx.env, 'commit') ?? '').trim()
  const commitMessage = (usageOptString(ctx.env, 'commit_message') ?? '').trim()
  const hasCommit = usageFlag(ctx.env, 'commit') || commitRaw === 'true' || Boolean(commitMessage)
  if (phaseNo && !hasCommit) {
    return planSpawn(bunSpec('phase.script.ts', resolved.featureDir, '--phase', phaseNo))
  }
  return planRunner('spec-ready', resolved.featureDir, ctx.env)
}

function planCloseout(ctx: PlanCtx): SpecPlan {
  const resolved = resolveFeatureOrError(ctx.env, ctx.rest)
  if (!resolved.ok) return resolved.plan
  return planRunner('spec-closeout', resolved.featureDir, ctx.env)
}

function planReviewHandoff({ rest, env }: PlanCtx): SpecPlan {
  const action = (usageOptString(env, 'action') ?? rest[0] ?? '').trim()
  const argv = ['bun', `${WORKFLOW_ROOT}/review_handoff.script.ts`, action]
  const feature = (usageOptString(env, 'feature') ?? rest.find(a => a !== action) ?? '').trim()
  if (feature) argv.push('--feature', feature)
  if (env.usage_handoff) argv.push('--handoff', env.usage_handoff)
  if (env.usage_base) argv.push('--base', env.usage_base)
  if (env.usage_head) argv.push('--head', env.usage_head)
  if (env.usage_focus) argv.push('--focus', env.usage_focus)
  pushUsageFlags(argv, env, ['json'])
  return planSpawn(argv.filter(Boolean))
}

function planKit({ rest }: PlanCtx): SpecPlan {
  return {
    kind: 'spawn',
    argv: bunPath('packages/ops/src/bin/spec_kit.script.ts', ...rest),
    env: copyUsageToChild(stripUsageEnv(process.env), process.env, ['dry_run', 'approve', 'json', 'raw', 'loop'])
  }
}

const SPEC_COMMANDS = {
  lint: planLint,
  trace: planTrace,
  gate: planGate,
  test: planTest,
  init: planInit,
  worktree: planWorktree,
  opencode: planOpencode,
  library: planLibrary,
  workflow: planWorkflow,
  audit: planAudit,
  conform: planConform,
  ready: planReady,
  closeout: planCloseout,
  'review-handoff': planReviewHandoff,
  kit: planKit
} as const satisfies Record<string, PlannerFn>

/**
 * Pure dispatch planner — maps a subcommand + its positional `rest` + the
 * `usage_*` env into a downstream argv (or runner/error). No spawning, so every
 * branch (and global-flag propagation) is unit-testable. `deps.activeRun`
 * supplies the `workflow resume` fallback when no runId is given.
 */
export function planSpec(cmd: string, rest: string[], env: SpecEnv, deps: SpecPlanDeps = {}): SpecPlan {
  const conflict = rawJsonConflict(usageFlag(env, 'raw'), usageFlag(env, 'json'))
  if (conflict) return planError(conflict, 2)
  const handler = SPEC_COMMANDS[cmd as keyof typeof SPEC_COMMANDS]
  return handler ? handler({ rest, env, deps }) : planError(`spec: unknown action ${cmd}`, 2)
}
