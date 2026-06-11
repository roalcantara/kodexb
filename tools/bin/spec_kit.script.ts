#!/usr/bin/env bun
import { existsSync } from 'node:fs'
import path from 'node:path'
import { writeEnvelope } from '../../packages/workflow-runtime/src/kit_envelope.script.ts'
import {
  clearGate,
  isGateStage,
  printGateResumeHint
} from '../../packages/workflow-runtime/src/kit_human_gate.script.ts'
import { preflightCheck } from '../../packages/workflow-runtime/src/kit_preflight.script.ts'
import {
  type ResolvedStep,
  resolveNext,
  stageToVerb,
  terminalStageSentinel
} from '../../packages/workflow-runtime/src/kit_step_resolver.script.ts'
import { generateRunId } from '../../packages/workflow-runtime/src/workflow_run.script.ts'
import { type ResolveResult, resolveActiveFeatureDir } from '../governance/specs/resolve_active_feature_dir.script.ts'

const ALL_KIT_VERBS = new Set([
  'next',
  'specify',
  'clarify',
  'checklist',
  'plan',
  'analyze',
  'tasks',
  'handoff-generate',
  'implement',
  'pr-prep',
  'review',
  'gate',
  'pr-open',
  'pr-check'
])

type Env = Record<string, string | undefined>
const isTrue = (env: Env, k: string): boolean => env[k] === 'true'

function helpText(): string {
  return [
    'kb spec kit — Spec Kit workflow verbs',
    '',
    'Usage: mise run spec kit <verb> [feature] [flags]',
    '',
    'Verbs:',
    '  next               Resolve and dispatch the next stage (recommended default)',
    '  specify            Create or refresh spec.md',
    '  clarify            Resolve spec ambiguities',
    '  checklist          Generate checklists/requirements.md',
    '  plan               Produce plan.md',
    '  analyze            Cross-artifact consistency check (--pass plan|tasks)',
    '  tasks              Produce tasks.md + handoff.md',
    '  handoff-generate   Emit worker handoff (gherkin)',
    '  implement          Execute tasks.md under FCIS rules',
    '  pr-prep            Run PR preflight checks (hk check --profile pr)',
    '  review             Read-only reviewer (app-review-handoff)',
    '  gate               Deterministic closeout (spec gate + gate.sh)',
    '  pr-open            Create PR (gh pr create)',
    '  pr-check           Watch required CI checks (gh pr checks --watch)',
    '',
    'Flags (next only):',
    '  --dry-run          Print resolved verb, do not execute',
    '  --approve          Clear pending human gate and continue',
    '  --loop             Repeat until terminal (Slice B)',
    '',
    'Global flags:',
    '  --raw              Machine output, no gum styling',
    '  --json             Machine-readable JSON'
  ].join('\n')
}

function resolveFeature(env: Env, rest: string[]): ResolveResult {
  const positional = (env.usage_feature ?? rest[0] ?? '').trim()
  const resolved = resolveActiveFeatureDir(positional || undefined)
  if (resolved.ok) return resolved
  // Fallback: accept a positional dir with spec.md when it is not the active feature.
  if (positional && existsSync(path.join(positional, 'spec.md'))) {
    return { ok: true, featureDir: positional }
  }
  return resolved
}

function shellRun(argv: string[]): number {
  const result = Bun.spawnSync(argv, { stdout: 'inherit', stderr: 'inherit' })
  return result.exitCode ?? 1
}

function runVerbHandler(verb: string, featureDir: string, _env: Env, runId: string): number {
  const t0 = performance.now()
  let exitCode: number

  switch (verb) {
    case 'specify':
    case 'clarify':
    case 'checklist':
    case 'plan':
    case 'analyze':
    case 'tasks':
    case 'handoff-generate':
    case 'implement': {
      const handlerPath = `packages/workflow-runtime/src/kit_verbs/${verb.replace(/-/g, '_')}.script.ts`
      exitCode = shellRun(['bun', handlerPath, '--feature', featureDir])
      break
    }
    case 'pr-prep':
      exitCode = shellRun(['bun', 'packages/workflow-runtime/src/kit_verbs/pr_prep.script.ts'])
      break
    case 'review':
      exitCode = shellRun(['bun', 'packages/workflow-runtime/src/kit_verbs/review.script.ts', '--feature', featureDir])
      break
    case 'gate':
      exitCode = shellRun(['bun', 'packages/workflow-runtime/src/kit_verbs/gate.script.ts'])
      break
    case 'pr-open':
      exitCode = shellRun(['bun', 'packages/workflow-runtime/src/kit_verbs/pr_open.script.ts'])
      break
    case 'pr-check':
      exitCode = shellRun(['bun', 'packages/workflow-runtime/src/kit_verbs/pr_check.script.ts'])
      break
    default:
      exitCode = 1
  }

  const elapsed = performance.now() - t0
  const status = exitCode === 0 ? 'DONE' : ('RETRYABLE_FAILURE' as const)

  writeEnvelope({
    runId,
    stage: verb,
    status,
    artifactsCreated: [],
    evidence: [],
    diagnostics: [],
    retryCount: 0,
    elapsedMs: Math.round(elapsed),
    featureDir
  })

  return exitCode
}

function printResolved(step: ResolvedStep, env: Env): void {
  if (isTrue(env, 'usage_json')) {
    process.stdout.write(
      `${JSON.stringify({ stage: step.stage, kind: step.kind, focusHint: step.focusHint ?? null })}\n`
    )
    return
  }
  const hint = step.focusHint ? `    # ${step.focusHint}` : ''
  if (step.stage === terminalStageSentinel) {
    process.stdout.write('all stages complete — ready for manual testing\n')
  } else {
    process.stdout.write(`${step.stage}${hint}\n`)
  }
}

function hasCliFlag(name: string): boolean {
  return process.argv.includes(`--${name}`) || process.argv.includes(`-${name[0]}`)
}

function runNext(featureDir: string, env: Env): number {
  const dryRun = isTrue(env, 'usage_dry_run') || hasCliFlag('dry-run')
  const approveFlag = env.usage_approve || hasCliFlag('approve') || ''
  const jsonOutput = isTrue(env, 'usage_json') || hasCliFlag('json')
  const rawOutput = isTrue(env, 'usage_raw') || hasCliFlag('raw')
  const featureSlug = path.basename(featureDir).replace(/^\d+-/, '')
  const runId = generateRunId(featureSlug)

  const step = resolveNext(featureDir, runId)

  if (dryRun) {
    printResolved(step, {
      ...env,
      usage_json: jsonOutput ? 'true' : undefined,
      usage_raw: rawOutput ? 'true' : undefined
    })
    return 0
  }

  if (step.stage === terminalStageSentinel) {
    if (jsonOutput) {
      process.stdout.write(`${JSON.stringify({ stage: terminalStageSentinel, runId })}\n`)
    } else {
      process.stdout.write(`runId: ${runId}    all stages complete — ready for manual testing\n`)
    }
    return 0
  }

  if (isGateStage(step.stage)) {
    if (approveFlag) {
      clearGate(featureDir, runId, step.stage)
      const next = resolveNext(featureDir, runId)
      if (isGateStage(next.stage)) {
        printGateResumeHint(next.stage)
        return 1
      }
      if (next.stage === terminalStageSentinel) {
        process.stdout.write(`runId: ${runId}    all stages complete — ready for manual testing\n`)
        return 0
      }
      const nextVerb = stageToVerb(next.stage)
      const pf = preflightCheck(nextVerb, featureDir, runId, { approve: false })
      if (!pf.allowed) {
        process.stderr.write(`kit next: blocked — ${pf.reason}\n`)
        return 1
      }
      return runVerbHandler(nextVerb, featureDir, env, runId)
    }
    printGateResumeHint(step.stage)
    return 1
  }

  const verb = stageToVerb(step.stage)
  const preflight = preflightCheck(verb, featureDir, runId, { approve: Boolean(approveFlag) })
  if (!preflight.allowed) {
    if (jsonOutput) {
      process.stdout.write(`${JSON.stringify({ blocked: true, stage: step.stage, reason: preflight.reason })}\n`)
    } else {
      process.stderr.write(`kit next: blocked — ${preflight.reason}\n`)
      if (preflight.resumeHint) process.stderr.write(`${preflight.resumeHint}\n`)
    }
    return 1
  }

  return runVerbHandler(verb, featureDir, env, runId)
}

function main(): void {
  const args = process.argv.slice(2)
  const verb = args.shift() ?? ''

  if (!verb || verb === '--help' || verb === '-h' || verb === 'help') {
    process.stdout.write(helpText())
    process.exit(verb === '--help' || verb === '-h' || verb === 'help' ? 0 : 2)
  }

  if (!ALL_KIT_VERBS.has(verb)) {
    process.stderr.write(`spec kit: unknown verb "${verb}"\n`)
    process.stderr.write(`Allowed: ${[...ALL_KIT_VERBS].sort().join(', ')}\n`)
    process.exit(2)
  }

  const env: Env = process.env as Env
  const resolved = resolveFeature(env, args)

  if (!resolved.ok) {
    process.stderr.write(`spec kit: ${resolved.message}\n`)
    process.exit(resolved.exitCode)
  }

  if (verb === 'next') {
    process.exit(runNext(resolved.featureDir, env))
    return
  }

  const featureSlug = path.basename(resolved.featureDir).replace(/^\d+-/, '')
  const runId = generateRunId(featureSlug)
  process.exit(runVerbHandler(verb, resolved.featureDir, env, runId))
}

if (import.meta.main) main()
