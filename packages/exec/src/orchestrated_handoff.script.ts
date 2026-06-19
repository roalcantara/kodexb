#!/usr/bin/env bun
/**
 * spec workflow orchestrated-handoff — phase detection + subtask manifest.
 * See assets/guides/SDD_WORKFLOW_GUIDE.md.
 */
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { catalogPaths } from './catalog_paths.util'
import { parseHandoffAcTable } from './handoff_generate.script'
import { UsageError, withUsage } from './usage.script'
import { emitPhaseDecided, generateRunId, slugFromFeatureDir, WorkflowRunWriter } from './workflow_run.script'

export type FileSet = {
  spec: boolean
  plan: boolean
  tasks: boolean
  handoff: boolean
  analyzePlanChecklist: boolean
  analyzeTasksChecklist: boolean
  handoffEmittedGherkin: boolean
  implementComplete: boolean
}

export type Phase =
  | 'specify'
  | 'plan'
  | 'analyze-plan'
  | 'tasks'
  | 'analyze-tasks'
  | 'handoff-generate'
  | 'implement'
  | 'gate'

export type NextSuggestion = {
  phase: Phase
  command: string
  focusHint?: string
}

const ANALYZE_PLAN_HINT = 'Focus: plan.md traceability'
const ANALYZE_TASKS_HINT = 'Focus: tasks.md + handoff.md Evidence'

const RE_LEADING_DIGITS = /^\d+-/
const RE_SCENARIO_TAGS = /Scenario:|@unit|@e2e/

/**
 * Optional manifest hint: when the detector reaches the handoff-emit transition,
 * it asks this function whether the manifest currently includes
 * `gherkin-bdd-handoff`. Returning `false` skips straight to `speckit.implement`.
 * Defaulting to `true` keeps the function pure when callers don't pass one.
 */
export type ManifestProbe = () => boolean

/** Pure phase detector. Order-sensitive: first matching transition wins. */
export function detectPhase(
  files: FileSet,
  featureDir = `${catalogPaths.specs_root}/NNN-slug`,
  manifestNeedsHandoff: ManifestProbe = () => true
): NextSuggestion {
  if (!files.spec) {
    return {
      phase: 'specify',
      command: 'speckit.specify (or `mise run spec init --id <NNN> --slug <slug>` first for greenfield)'
    }
  }
  if (!files.plan) {
    return {
      phase: 'plan',
      command: 'speckit.plan',
      focusHint: `Run: mise run spec lint ${featureDir} --strict`
    }
  }
  if (!files.analyzePlanChecklist) {
    return {
      phase: 'analyze-plan',
      command: 'speckit.analyze',
      focusHint: ANALYZE_PLAN_HINT
    }
  }
  if (!files.tasks) {
    return { phase: 'tasks', command: 'speckit.tasks' }
  }
  // A2: tasks.md without handoff.md must NOT skip ahead — handoff.md is the AC
  // tracker that the tasks-pass analyze and handoff-generate both depend on.
  if (!files.handoff) {
    return {
      phase: 'tasks',
      command: 'speckit.tasks',
      focusHint: 'Complete handoff.md (acceptance tracker) before tasks-pass analyze'
    }
  }
  if (!files.analyzeTasksChecklist) {
    return {
      phase: 'analyze-tasks',
      command: 'speckit.analyze',
      focusHint: ANALYZE_TASKS_HINT
    }
  }
  // A1: only suggest handoff-generate when the manifest actually needs it.
  if (!files.handoffEmittedGherkin && manifestNeedsHandoff()) {
    return {
      phase: 'handoff-generate',
      command: `mise run spec workflow handoff generate ${featureDir} --focus gherkin`
    }
  }
  if (!files.implementComplete) {
    return { phase: 'implement', command: 'speckit.implement' }
  }
  return {
    phase: 'gate',
    command: `mise run spec gate ${featureDir}`
  }
}

/** Read the feature dir into a FileSet for the detector. */
export function scanFeatureDir(featureDir: string, handoffsDir = 'tmp/handoffs'): FileSet {
  const slug = path.basename(featureDir).replace(RE_LEADING_DIGITS, '')
  const handoffsPath = path.resolve(handoffsDir)
  const handoffEmittedGherkin = existsSync(path.join(handoffsPath, `opencode-${slug}-gherkin.md`))
  return {
    spec: existsSync(path.join(featureDir, 'spec.md')),
    plan: existsSync(path.join(featureDir, 'plan.md')),
    tasks: existsSync(path.join(featureDir, 'tasks.md')),
    handoff: existsSync(path.join(featureDir, 'handoff.md')),
    analyzePlanChecklist: existsSync(path.join(featureDir, 'checklists/analyze-plan.md')),
    analyzeTasksChecklist: existsSync(path.join(featureDir, 'checklists/analyze-tasks.md')),
    handoffEmittedGherkin,
    // A3: switch from `.implement.done` to `checklists/implement-done.md` for
    // symmetry with `analyze-plan.md` / `analyze-tasks.md`. Documented in spec
    // OHW-3 AC5 + Clarifications.
    implementComplete: existsSync(path.join(featureDir, 'checklists/implement-done.md'))
  }
}

export type ManifestInput = {
  featureDir: string
  slug: string
  handoffMd: string
  planMd: string | null
}

export type SubtaskType = 'implement-src' | 'gherkin-bdd-handoff' | 'catalog-touch'

export type Subtask = {
  type: SubtaskType
  provider: 'primary' | 'opencode'
  description: string
}

/** Rule-based subtask manifest. See OHW-3 AC6 in spec. */
export function buildSubtaskManifest(input: ManifestInput): Subtask[] {
  const { slug, handoffMd, planMd } = input
  const acRows = parseHandoffAcTable(handoffMd)
  const subtasks: Subtask[] = [
    {
      type: 'implement-src',
      provider: 'primary',
      description: 'Primary agent runs speckit.implement under src/ with co-located *.spec.ts files.'
    }
  ]

  const hasOperatorSmoke = acRows.some(r => r.isOperatorSmoke)
  const planMentionsFeatures = (planMd ?? '').includes('assets/features/')
  const planMentionsGherkinUncovered = detectPlanGherkinUncovered(planMd, acRows)

  if (hasOperatorSmoke || planMentionsFeatures || planMentionsGherkinUncovered) {
    subtasks.push({
      type: 'gherkin-bdd-handoff',
      provider: 'opencode',
      description: `Worker consumes tmp/handoffs/opencode-${slug}-gherkin.md for Gherkin/BDD work.`
    })
  }

  if ((planMd ?? '').includes('assets/catalog/catalog.yaml')) {
    subtasks.push({
      type: 'catalog-touch',
      provider: 'primary',
      description: 'Plan adds or modifies a catalog key; validate + ship checklist required.'
    })
  }

  return subtasks
}

function detectPlanGherkinUncovered(
  planMd: string | null,
  acRows: { sliceId: string | null; evidence: string }[]
): boolean {
  if (!planMd) return false
  const sliceIds = acRows.map(r => r.sliceId).filter((s): s is string => Boolean(s))
  const evidenceContainsSlice = acRows.some(r => sliceIds.some(s => r.evidence.toLowerCase().includes(s.toLowerCase())))
  const planNamesScenario = RE_SCENARIO_TAGS.test(planMd)
  return planNamesScenario && !evidenceContainsSlice
}

export function renderManifestXml(subtasks: Subtask[]): string {
  const inner = subtasks
    .map(
      s =>
        `  <task>\n    <type>${s.type}</type>\n    <provider>${s.provider}</provider>\n    <description>${escapeXml(s.description)}</description>\n  </task>`
    )
    .join('\n')
  return `<tasks>\n${inner}\n</tasks>\n`
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export type Args = {
  workflowName?: string
  featureDir: string
  manifest: boolean
  next: boolean
  lint: boolean
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: pre-existing complexity, refactor deferred
export function parseArgs(argv: string[]): Args {
  const args: Partial<Args> = { manifest: false, next: false, lint: false }
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i]
    if (!flag) continue
    if (!flag.startsWith('-') && !args.workflowName) {
      args.workflowName = flag
      continue
    }
    switch (flag) {
      case '--feature': {
        const v = argv[++i]
        if (!v) throw new UsageError('--feature requires a value')
        args.featureDir = v
        break
      }
      case '--manifest':
        args.manifest = true
        break
      case '--next':
        args.next = true
        break
      case '--lint':
        args.lint = true
        break
      case '--help':
      case '-h':
        throw new UsageError(usageString(), 0)
      default:
        if (!flag.startsWith('-')) break
        throw new UsageError(`unknown flag: ${flag}`)
    }
  }
  if (!args.featureDir) throw new UsageError('--feature is required')
  if (!args.next && !args.manifest && !args.lint) args.next = true
  return args as Args
}

function usageString(): string {
  return 'Usage: spec workflow orchestrated-handoff --feature <dir> [--next|--manifest|--lint]'
}

/** OHW-6 AC1: delegate to lint.script.ts; do NOT duplicate EARS logic here. */
export function runLint(
  featureDir: string,
  options: {
    spawn?: (cmd: string[]) => { exitCode: number | null }
  } = {}
): number {
  const spawn =
    options.spawn ??
    ((cmd: string[]) => {
      const sub = Bun.spawnSync(cmd, { stdout: 'inherit', stderr: 'inherit' })
      return { exitCode: sub.exitCode }
    })
  const r = spawn(['bun', 'packages/ops/src/governance/specs/lint.script.ts', '--strict', featureDir])
  return r.exitCode ?? 1
}

export function run(argv: string[], options?: { writer?: WorkflowRunWriter }): number {
  const t0 = performance.now()
  const ar = withUsage(() => parseArgs(argv), 'spec workflow', usageString())
  if ('exitCode' in ar) return ar.exitCode
  const args = ar.value

  if (!existsSync(args.featureDir)) {
    console.error(`spec workflow: feature dir not found: ${args.featureDir}`)
    return 2
  }

  const writer =
    options?.writer ?? new WorkflowRunWriter(generateRunId(slugFromFeatureDir(args.featureDir)), args.featureDir)

  if (args.lint) return runLint(args.featureDir)

  if (args.manifest) {
    const handoffPath = path.join(args.featureDir, 'handoff.md')
    const planPath = path.join(args.featureDir, 'plan.md')
    if (!existsSync(handoffPath)) {
      console.error(`spec workflow: --manifest requires ${handoffPath}`)
      return 1
    }
    const handoffMd = readFileSync(handoffPath, 'utf-8')
    const planMd = existsSync(planPath) ? readFileSync(planPath, 'utf-8') : null
    const slug = slugFromFeatureDir(args.featureDir)
    const subtasks = buildSubtaskManifest({ featureDir: args.featureDir, slug, handoffMd, planMd })
    process.stdout.write(renderManifestXml(subtasks))
    writer.emit({
      type: 'manifest_emitted',
      run_id: writer.runId,
      ts: new Date().toISOString(),
      feature_dir: args.featureDir,
      duration_ms: performance.now() - t0,
      subtask_types: subtasks.map(s => s.type),
      subtask_count: subtasks.length
    })
    return 0
  }

  const files = scanFeatureDir(args.featureDir)
  const probe: ManifestProbe = () => {
    const handoffPath = path.join(args.featureDir, 'handoff.md')
    if (!existsSync(handoffPath)) return true
    const planPath = path.join(args.featureDir, 'plan.md')
    const handoffMd = readFileSync(handoffPath, 'utf-8')
    const planMd = existsSync(planPath) ? readFileSync(planPath, 'utf-8') : null
    const slug = slugFromFeatureDir(args.featureDir)
    return buildSubtaskManifest({ featureDir: args.featureDir, slug, handoffMd, planMd }).some(
      s => s.type === 'gherkin-bdd-handoff'
    )
  }
  const next = detectPhase(files, args.featureDir, probe)
  emitPhaseDecided(writer, args.featureDir, t0, files, probe, next)
  if (next.focusHint) {
    console.log(`${next.command}    # ${next.focusHint}`)
  } else {
    console.log(next.command)
  }
  return 0
}

if (import.meta.main) process.exit(run(process.argv.slice(2)))
