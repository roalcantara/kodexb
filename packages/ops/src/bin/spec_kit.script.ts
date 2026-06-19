#!/usr/bin/env bun
import path from 'node:path'
import { writeEnvelope } from '@kb/exec/kit_envelope.script'
import { clearGate, isGateStage, printGateResumeHint } from '@kb/exec/kit_human_gate.script'
import { preflightCheck } from '@kb/exec/kit_preflight.script'
import { type ResolvedStep, resolveNext, stageToVerb, terminalStageSentinel } from '@kb/exec/kit_step_resolver.script'
import { generateRunId } from '@kb/exec/workflow_run.script'
import { getLogger } from '@kb/shared/logging'
import { readTextFileSync } from '@kb/shared/text_file'
import { type ResolveResult, resolveActiveFeatureDir } from '../governance/specs/resolve_active_feature_dir.script'
import { runBinMain } from '../support/lib/cli/dispatch.script'
import { usageFlag, usageStrings } from '../support/lib/cli/usage_env.script'

const log = getLogger(['kb', 'ops', 'spec_kit'])

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
  const strings = usageStrings(env, ['feature'])
  const positional = (strings.feature ?? rest[0] ?? '').trim()
  const resolved = resolveActiveFeatureDir(positional || undefined)
  if (resolved.ok) return resolved
  if (positional && readTextFileSync(path.join(positional, 'spec.md')).isOk()) {
    return { ok: true, featureDir: positional }
  }
  return resolved
}

function shellRun(argv: string[]): number {
  const result = Bun.spawnSync(argv, { stdout: 'inherit', stderr: 'inherit' })
  return result.exitCode ?? 1
}

function makeKitHandler(scriptName: string, args: string[]): () => number {
  return () => shellRun(['bun', `packages/exec/src/kit_verbs/${scriptName}.script.ts`, ...args])
}

function buildActionMap(featureDir: string, runId: string): Record<string, () => number> {
  return {
    specify: makeKitHandler('specify', ['--feature', featureDir]),
    clarify: makeKitHandler('clarify', ['--feature', featureDir]),
    checklist: makeKitHandler('checklist', ['--feature', featureDir]),
    plan: makeKitHandler('plan', ['--feature', featureDir]),
    analyze: makeKitHandler('analyze', ['--feature', featureDir]),
    tasks: makeKitHandler('tasks', ['--feature', featureDir]),
    'handoff-generate': makeKitHandler('handoff_generate', ['--feature', featureDir]),
    implement: makeKitHandler('implement', ['--feature', featureDir]),
    'pr-prep': makeKitHandler('pr_prep', []),
    review: makeKitHandler('review', ['--feature', featureDir]),
    gate: makeKitHandler('gate', []),
    'pr-open': makeKitHandler('pr_open', ['--run-id', runId, '--feature', featureDir]),
    'pr-check': makeKitHandler('pr_check', [])
  }
}

function runVerbHandler(verb: string, featureDir: string, _env: Env, runId: string): number {
  const t0 = performance.now()
  const actionMap = buildActionMap(featureDir, runId)
  const handler = actionMap[verb]

  const exitCode = handler ? handler() : 1

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
  if (usageFlag(env, 'json')) {
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

function printSingleStepTerminal(activeRunId: string, jsonOutput: boolean): void {
  if (jsonOutput) {
    process.stdout.write(`${JSON.stringify({ stage: terminalStageSentinel, runId: activeRunId })}\n`)
  } else {
    process.stdout.write(`runId: ${activeRunId}    all stages complete — ready for manual testing\n`)
  }
}

function printLoopTerminal(runId: string, jsonOutput: boolean): void {
  if (jsonOutput) {
    process.stdout.write(`${JSON.stringify({ stage: terminalStageSentinel, runId })}\n`)
    return
  }
  const today = new Date().toISOString().slice(0, 10)
  const prRefPath = path.resolve('tmp/workflow-runs', today, runId, 'pr_ref')
  const prResult = readTextFileSync(prRefPath)
  if (prResult.isOk()) {
    const prUrl = prResult.value.trim()
    process.stdout.write(`runId: ${runId}    PR: ${prUrl}    all stages complete — ready for manual testing\n`)
  } else {
    process.stdout.write(`runId: ${runId}    all stages complete — ready for manual testing\n`)
  }
}

function executeResolvedStep(
  featureDir: string,
  env: Env,
  activeRunId: string,
  step: ResolvedStep,
  options?: { deferTerminalStdout?: boolean }
): number {
  const dryRun = usageFlag(env, 'dry_run')
  const approveFlag = usageFlag(env, 'approve')
  const jsonOutput = usageFlag(env, 'json')
  const rawOutput = usageFlag(env, 'raw')

  if (dryRun) {
    printResolved(step, {
      ...env,
      usage_json: jsonOutput ? 'true' : undefined,
      usage_raw: rawOutput ? 'true' : undefined
    })
    return 0
  }

  if (step.stage === terminalStageSentinel) {
    if (!options?.deferTerminalStdout) {
      printSingleStepTerminal(activeRunId, jsonOutput)
    }
    return 0
  }

  if (isGateStage(step.stage)) {
    if (approveFlag) {
      clearGate(featureDir, activeRunId, step.stage)
      const next = resolveNext(featureDir, activeRunId)
      if (isGateStage(next.stage)) {
        printGateResumeHint(next.stage)
        return 1
      }
      if (next.stage === terminalStageSentinel) {
        if (!options?.deferTerminalStdout) {
          printSingleStepTerminal(activeRunId, jsonOutput)
        }
        return 0
      }
      const nextVerb = stageToVerb(next.stage)
      const pf = preflightCheck(nextVerb, featureDir, activeRunId, { approve: false })
      if (!pf.allowed) {
        log.error(`kit next: blocked — ${pf.reason}`)
        return 1
      }
      return runVerbHandler(nextVerb, featureDir, env, activeRunId)
    }
    printGateResumeHint(step.stage)
    return 1
  }

  const verb = stageToVerb(step.stage)
  const preflight = preflightCheck(verb, featureDir, activeRunId, { approve: Boolean(approveFlag) })
  if (!preflight.allowed) {
    if (jsonOutput) {
      process.stdout.write(`${JSON.stringify({ blocked: true, stage: step.stage, reason: preflight.reason })}\n`)
    } else {
      log.error(`kit next: blocked — ${preflight.reason}`)
      if (preflight.resumeHint) log.info(preflight.resumeHint)
    }
    return 1
  }

  return runVerbHandler(verb, featureDir, env, activeRunId)
}

function runNext(featureDir: string, env: Env, runId?: string): number {
  const featureSlug = path.basename(featureDir).replace(/^\d+-/, '')
  const activeRunId = runId ?? generateRunId(featureSlug)
  const step = resolveNext(featureDir, activeRunId)
  return executeResolvedStep(featureDir, env, activeRunId, step)
}

function runLoop(featureDir: string, env: Env): number {
  const featureSlug = path.basename(featureDir).replace(/^\d+-/, '')
  const runId = generateRunId(featureSlug)
  const jsonOutput = usageFlag(env, 'json')
  let iteration = 0

  for (;;) {
    iteration += 1
    const step = resolveNext(featureDir, runId)

    if (step.stage === terminalStageSentinel) {
      printLoopTerminal(runId, jsonOutput)
      return 0
    }

    if (jsonOutput) {
      process.stdout.write(`${JSON.stringify({ type: 'stage.entered', runId, stage: step.stage, iteration })}\n`)
    } else {
      process.stdout.write(`${runId} [${step.stage}] `)
    }

    const exitCode = executeResolvedStep(featureDir, env, runId, step, { deferTerminalStdout: true })

    if (exitCode !== 0) {
      return exitCode
    }

    if (iteration > 50) {
      log.error('kit loop: max iterations reached')
      return 1
    }
  }
}

function main(): number {
  const args = process.argv.slice(2)
  const verb = args.shift() ?? ''

  if (!verb || verb === '--help' || verb === '-h' || verb === 'help') {
    process.stdout.write(helpText())
    return verb === '--help' || verb === '-h' || verb === 'help' ? 0 : 2
  }

  if (!ALL_KIT_VERBS.has(verb)) {
    log.error(`spec kit: unknown verb "${verb}"`)
    log.error(`Allowed: ${[...ALL_KIT_VERBS].sort().join(', ')}`)
    return 2
  }

  const env: Env = process.env as Env
  const resolved = resolveFeature(env, args)

  if (!resolved.ok) {
    log.error(`spec kit: ${resolved.message}`)
    return resolved.exitCode
  }

  if (verb === 'next') {
    const loopFlag = usageFlag(env, 'loop')
    if (loopFlag) {
      return runLoop(resolved.featureDir, env)
    }
    return runNext(resolved.featureDir, env)
  }

  const featureSlug = path.basename(resolved.featureDir).replace(/^\d+-/, '')
  const runId = generateRunId(featureSlug)
  return runVerbHandler(verb, resolved.featureDir, env, runId)
}

runBinMain(main)
