#!/usr/bin/env bun
/**
 * spec workflow — default run mode (TMF-8). Routes to orchestrated-handoff
 * with feature inference, allowlisted spawn, and NDJSON event recording.
 */
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { resolveActiveFeatureDir } from './resolve_active_feature_dir.script.ts'
import { parseHandoffAcTable } from './workflow/handoff_generate.script.ts'
import { createAnsweredDecision } from './workflow/intervention.script.ts'
import { workflowMachine } from './workflow/machine.script.ts'
import { readSharedMemory, writeSharedMemory } from './workflow/memory.script.ts'
import { detectPhase, scanFeatureDir } from './workflow/orchestrated_handoff.script.ts'
import { hydrateMachineActor, persistMachineSnapshot } from './workflow/snapshot.script.ts'
import {
  emitPhaseDecided,
  filesetFingerprint,
  generateRunId,
  slugFromFeatureDir,
  WorkflowRunWriter
} from './workflow/workflow_run.script.ts'

export { emitPhaseDecided, filesetFingerprint }

export function applyResumeAnswer(
  hydrated: NonNullable<ReturnType<typeof hydrateMachineActor>>,
  answerStr: string,
  runDir: string,
  dateStr: string,
  runId: string
): void {
  const eqIdx = answerStr.indexOf('=')
  if (eqIdx === -1) {
    console.error(`spec workflow resume: --answer expects <qid>=<value>, got "${answerStr}"`)
    process.exit(2)
  }
  const questionId = answerStr.slice(0, eqIdx)
  if (!questionId) {
    console.error(`spec workflow resume: --answer has empty question id, got "${answerStr}"`)
    process.exit(2)
  }
  const value = answerStr.slice(eqIdx + 1)

  const ts = new Date().toISOString()
  const writer = new WorkflowRunWriter(runId, hydrated.state.profile_name, runDir)
  const shared = readSharedMemory(runDir, dateStr, runId)
  shared[questionId] = value
  writeSharedMemory(runDir, dateStr, runId, shared)

  const event = createAnsweredDecision(questionId, value, ts)
  writer.emit({
    type: 'decision.answered',
    run_id: runId,
    ts,
    feature_dir: hydrated.state.profile_name,
    duration_ms: 0,
    question_id: event.question_id,
    source: 'operator',
    rationale: event.rationale
  })

  hydrated.actor.send({ type: 'INPUT.ANSWERED', question_id: questionId, value })
  persistMachineSnapshot(
    hydrated.actor,
    { rootDir: runDir, metricsDir: path.join(runDir, 'metrics') },
    runId,
    dateStr,
    hydrated.state.profile_name,
    hydrated.state.profile_schema_version,
    hydrated.state.started_at,
    { ...hydrated.actor.getSnapshot().context.shared_memory, ...shared }
  )
  console.log(`spec workflow resume: answered ${questionId}=${value}`)
}

const ALLOWLIST_PREFIXES = ['mise run', 'hk check', 'bash tools/governance/specs/gate.sh']

export function parseWorkflowArgs(argv: string[]) {
  const args: Record<string, string | boolean> = {}
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i]
    if (!flag) continue
    if (!flag.startsWith('-')) {
      args.name = flag
      continue
    }
    switch (flag) {
      case '--feature':
        args.feature = argv[++i] ?? ''
        break
      case '--dry-run':
        args.dryRun = true
        break
      case '--next':
        args.dryRun = true
        args.deprecationWarned = true
        break
      case '--manifest':
        args.manifest = true
        break
      case '--lint':
        args.lint = true
        break
      case '--answer':
        {
          const val = argv[i + 1]
          if (val === undefined || val.startsWith('-')) {
            console.error('spec workflow: --answer requires a value')
            process.exit(2)
          }
          i += 1
          args.answer = val
        }
        break
      case '--approve':
        {
          const val = argv[i + 1]
          if (val === undefined || val.startsWith('-')) {
            console.error('spec workflow: --approve requires a value')
            process.exit(2)
          }
          i += 1
          args.approve = val
        }
        break
      case '--run-id':
        {
          const val = argv[i + 1]
          if (val === undefined || val.startsWith('-')) {
            console.error('spec workflow: --run-id requires a value')
            process.exit(2)
          }
          i += 1
          args.runId = val
        }
        break
      case '--help':
      case '-h':
        args.help = true
        break
      default:
        if (!flag.startsWith('-')) break
        args.unknown = flag
    }
  }
  return args
}

function isAllowlisted(command: string): boolean {
  return ALLOWLIST_PREFIXES.some(p => command.startsWith(p))
}

function spawnCommand(command: string): number {
  const parts = command.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 0
  const c = Bun.spawnSync(parts, { stdout: 'inherit', stderr: 'inherit', stdin: 'inherit' })
  return c.exitCode ?? 1
}

function run(): void {
  const argv = process.argv.slice(2)
  const args = parseWorkflowArgs(argv)

  if (args.help) {
    console.log(
      [
        'Usage: spec workflow [name] [options]',
        '',
        'Options:',
        '  --feature <dir>    Feature directory (inferred if omitted)',
        '  --dry-run          Print next step without running (default when not allowlisted)',
        '  --manifest         Print XML subtask manifest (backward compat)',
        '  --lint             Run spec lint (backward compat)',
        '  --next             Alias for --dry-run (deprecated)',
        '  --help             Show this help'
      ].join('\n')
    )
    process.exit(0)
  }

  if (args.unknown) {
    console.error(`spec workflow: unknown flag "${args.unknown}"`)
    process.exit(2)
  }

  if (args.deprecationWarned) {
    console.error('spec workflow: --next is deprecated; use --dry-run instead')
  }

  if (args.feature !== undefined && (args.feature === '' || String(args.feature).startsWith('-'))) {
    console.error(`spec workflow: --feature requires a value, got "${String(args.feature)}"`)
    process.exit(2)
  }

  const name = (args.name as string) || 'orchestrated-handoff'

  if (name === 'resume') {
    const runDir = path.resolve('tmp/workflow-runs')
    const dateStr = new Date().toISOString().slice(0, 10)
    const runId = (args.runId as string) || ''

    if (!runId) {
      console.error('spec workflow resume: --run-id required')
      process.exit(2)
    }

    const hydrated = hydrateMachineActor(
      workflowMachine,
      { rootDir: runDir, metricsDir: path.join(runDir, 'metrics') },
      runId,
      dateStr
    )
    if (!hydrated) {
      console.error(`spec workflow resume: cannot hydrate run ${runId}`)
      process.exit(2)
    }

    hydrated.actor.start()

    const snap = hydrated.actor.getSnapshot()
    if (snap.matches('need_input') && args.approve) {
      hydrated.actor.send({ type: 'STAGE.APPROVED' })
      console.log(`spec workflow resume: approved stage ${snap.context.current_stage}`)
    }

    if (snap.matches('need_input') && args.answer) {
      applyResumeAnswer(hydrated, args.answer as string, runDir, dateStr, runId)
    }

    console.log(`spec workflow resume: run ${runId} hydrated (state: ${snap.value})`)
    hydrated.actor.stop()
    process.exit(0)
  }

  if (name !== 'orchestrated-handoff') {
    console.error(`spec workflow: unknown workflow "${name}". Allowed: orchestrated-handoff, resume`)
    process.exit(2)
  }

  let featureDir = args.feature as string | undefined
  if (!featureDir) {
    const resolved = resolveActiveFeatureDir()
    if (!resolved.ok) {
      console.error(resolved.message)
      process.exit(resolved.exitCode)
    }
    featureDir = resolved.featureDir
  }

  if (!existsSync(path.join(featureDir, 'spec.md'))) {
    console.error(`spec workflow: no spec.md found in ${featureDir}`)
    process.exit(2)
  }

  if (args.lint) {
    const r = Bun.spawnSync(['bun', 'tools/governance/specs/lint.script.ts', '--strict', featureDir], {
      stdout: 'inherit',
      stderr: 'inherit'
    })
    process.exit(r.exitCode ?? 1)
  }

  if (args.manifest) {
    const handoffPath = path.join(featureDir, 'handoff.md')
    if (!existsSync(handoffPath)) {
      console.error(`spec workflow: --manifest requires ${handoffPath}`)
      process.exit(1)
    }
    const slug = slugFromFeatureDir(featureDir)
    const handoffMd = readFileSync(handoffPath, 'utf-8')
    const planMd = existsSync(path.join(featureDir, 'plan.md'))
      ? readFileSync(path.join(featureDir, 'plan.md'), 'utf-8')
      : null
    const subtasks = buildSubtaskManifest({ featureDir: featureDir, slug, handoffMd, planMd })
    process.stdout.write(renderManifestXml(subtasks))
    process.exit(0)
  }

  const writer = new WorkflowRunWriter(generateRunId(slugFromFeatureDir(featureDir)), featureDir)
  const files = scanFeatureDir(featureDir)
  const probe = () => {
    const handoffPath = path.join(featureDir, 'handoff.md')
    if (!existsSync(handoffPath)) return true
    const hmd = readFileSync(handoffPath, 'utf-8')
    const pmd = existsSync(path.join(featureDir, 'plan.md'))
      ? readFileSync(path.join(featureDir, 'plan.md'), 'utf-8')
      : null
    const subSlug = slugFromFeatureDir(featureDir)
    return buildSubtaskManifest({ featureDir, slug: subSlug, handoffMd: hmd, planMd: pmd }).some(
      s => s.type === 'gherkin-bdd-handoff'
    )
  }

  const next = detectPhase(files, featureDir, probe)
  const t0 = performance.now()
  emitPhaseDecided(writer, featureDir, t0, files, probe, next)

  if (args.dryRun) {
    if (next.focusHint) {
      console.log(`${next.command}    # ${next.focusHint}`)
    } else {
      console.log(next.command)
    }
    process.exit(0)
  }

  if (isAllowlisted(next.command)) {
    const exitCode = spawnCommand(next.command)
    process.exit(exitCode)
  }

  console.log(next.command)
  process.exit(0)
}

function buildSubtaskManifest(input: {
  featureDir: string
  slug: string
  handoffMd: string
  planMd: string | null
}): { type: string; description: string }[] {
  const subtasks: { type: string; description: string }[] = [
    {
      type: 'implement-src',
      description: 'Primary agent runs speckit.implement under src/ with co-located *.spec.ts files.'
    }
  ]

  const acRows = parseHandoffAcTable(input.handoffMd)
  const hasOperatorSmoke = acRows.some(r => r.isOperatorSmoke)
  const planMentionsFeatures = (input.planMd ?? '').includes('assets/features/')
  if (hasOperatorSmoke || planMentionsFeatures) {
    subtasks.push({
      type: 'gherkin-bdd-handoff',
      description: `Worker consumes tmp/handoffs/opencode-${input.slug}-gherkin.md for Gherkin/BDD work.`
    })
  }

  if ((input.planMd ?? '').includes('assets/catalog/catalog.yaml')) {
    subtasks.push({
      type: 'catalog-touch',
      description: 'Plan adds or modifies a catalog key; validate + ship checklist required.'
    })
  }

  return subtasks
}

function renderManifestXml(subtasks: { type: string; description: string }[]): string {
  const inner = subtasks
    .map(
      s =>
        `  <task>\n    <type>${s.type}</type>\n    <description>${s.description.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</description>\n  </task>`
    )
    .join('\n')
  return `<tasks>\n${inner}\n</tasks>\n`
}

if (import.meta.main) run()
