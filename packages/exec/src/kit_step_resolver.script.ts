import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { type FileSet, scanFeatureDir } from './orchestrated_handoff.script'
import { readEnvelopeFile } from './orchestrator_resume.script'

export const terminalStageSentinel = '__terminal__' as const

export type KitStage =
  | 'specify'
  | 'review-spec'
  | 'clarify'
  | 'checklist'
  | 'plan'
  | 'review-plan'
  | 'analyze-plan'
  | 'tasks'
  | 'review-tasks'
  | 'analyze-tasks'
  | 'review-handoff'
  | 'handoff-generate'
  | 'implement'
  | 'pr-prep'
  | 'review'
  | 'gate'
  | 'pr-open'
  | 'pr-check'
  | typeof terminalStageSentinel

export type ResolvedStep = {
  stage: KitStage
  kind: 'LLM' | 'shell' | 'kb' | 'gate' | 'terminal'
  focusHint?: string
}

const CANONICAL_SEQUENCE: { stage: KitStage; kind: ResolvedStep['kind'] }[] = [
  { stage: 'specify', kind: 'LLM' },
  { stage: 'review-spec', kind: 'gate' },
  { stage: 'clarify', kind: 'LLM' },
  { stage: 'checklist', kind: 'LLM' },
  { stage: 'plan', kind: 'LLM' },
  { stage: 'review-plan', kind: 'gate' },
  { stage: 'analyze-plan', kind: 'LLM' },
  { stage: 'tasks', kind: 'LLM' },
  { stage: 'review-tasks', kind: 'gate' },
  { stage: 'analyze-tasks', kind: 'LLM' },
  { stage: 'review-handoff', kind: 'gate' },
  { stage: 'handoff-generate', kind: 'kb' },
  { stage: 'implement', kind: 'LLM' },
  { stage: 'pr-prep', kind: 'shell' },
  { stage: 'review', kind: 'kb' },
  { stage: 'gate', kind: 'shell' },
  { stage: 'pr-open', kind: 'shell' },
  { stage: 'pr-check', kind: 'shell' }
]

export const ALL_CANONICAL_STAGES = CANONICAL_SEQUENCE.map(r => r.stage)

const GATE_STAGES = new Set<KitStage>(['review-spec', 'review-plan', 'review-tasks', 'review-handoff'])

function getEnvelopePath(runId: string, stage: string): string | null {
  const root = 'tmp/workflow-runs'
  if (!existsSync(root)) return null
  try {
    for (const dateDir of readdirSync(root)) {
      const p = path.join(root, dateDir, runId, `${runId}.envelope.${stage}.json`)
      if (existsSync(p)) return p
    }
  } catch {
    // ignore
  }
  return null
}

export function resolveNext(featureDir: string, runId?: string): ResolvedStep {
  const files = scanFeatureDir(featureDir)

  for (const row of CANONICAL_SEQUENCE) {
    if (GATE_STAGES.has(row.stage)) {
      if (!gateCleared(featureDir, row.stage)) {
        return { stage: row.stage, kind: 'gate', focusHint: 'Operator review required — use kit next --approve' }
      }
      continue
    }

    const satisfied = stageSatisfied(row.stage, files, featureDir, runId)
    if (!satisfied) {
      const hint = focusHintFor(row.stage)
      return { stage: row.stage, kind: row.kind, focusHint: hint }
    }
  }

  return { stage: terminalStageSentinel, kind: 'terminal' }
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: pre-existing complexity, refactor deferred
function stageSatisfied(stage: KitStage, files: FileSet, featureDir: string, runId?: string): boolean {
  switch (stage as string) {
    case 'specify':
      return files.spec
    case 'clarify':
      return !specHasNeedsClarification(featureDir)
    case 'checklist':
      return checklistsRequirementsExists(featureDir)
    case 'plan':
      return files.plan
    case 'analyze-plan':
      return files.analyzePlanChecklist
    case 'tasks':
      return files.tasks && files.handoff
    case 'analyze-tasks':
      return files.analyzeTasksChecklist
    case 'handoff-generate': {
      if (files.handoffEmittedGherkin) return true
      if (!runId) return false
      const envPath = getEnvelopePath(runId, stage)
      if (!envPath) return false
      const envelope = readEnvelopeFile(envPath)
      return envelope?.status === 'DONE'
    }
    case 'implement': {
      if (!files.implementComplete) return false
      if (!runId) return true
      const reviewEnvPath = getEnvelopePath(runId, 'review')
      if (reviewEnvPath) {
        const reviewEnv = readEnvelopeFile(reviewEnvPath)
        if (reviewEnv && reviewEnv.status === 'RETRYABLE_FAILURE') {
          const implementEnvPath = getEnvelopePath(runId, 'implement')
          if (!implementEnvPath) return false
          try {
            const reviewTime = statSync(reviewEnvPath).mtimeMs
            const implementTime = statSync(implementEnvPath).mtimeMs
            if (implementTime <= reviewTime) {
              return false
            }
          } catch {
            return false
          }
        }
      }
      return true
    }
    case 'pr-prep':
    case 'review':
    case 'gate':
    case 'pr-open':
    case 'pr-check': {
      if (!runId) return false
      const envPath = getEnvelopePath(runId, stage)
      if (!envPath) return false
      const envelope = readEnvelopeFile(envPath)
      return envelope?.status === 'DONE'
    }
    default:
      return false
  }
}

function specHasNeedsClarification(featureDir: string): boolean {
  const specPath = path.join(featureDir, 'spec.md')
  if (!existsSync(specPath)) return true
  try {
    const content = readFileSync(specPath, 'utf-8')
    return content.includes('[NEEDS CLARIFICATION]')
  } catch {
    return true
  }
}

function checklistsRequirementsExists(featureDir: string): boolean {
  return existsSync(path.join(featureDir, 'checklists', 'requirements.md'))
}

function focusHintFor(stage: KitStage): string | undefined {
  switch (stage as string) {
    case 'specify':
      return 'Run /speckit-specify with feature description'
    case 'clarify':
      return 'Resolve [NEEDS CLARIFICATION] markers in spec.md'
    case 'checklist':
      return 'Generate checklists/requirements.md'
    case 'plan':
      return 'Run /speckit-plan'
    case 'analyze-plan':
      return 'Focus: plan.md traceability'
    case 'tasks':
      return 'Produce tasks.md + handoff.md'
    case 'analyze-tasks':
      return 'Focus: tasks.md + handoff.md Evidence'
    case 'handoff-generate':
      return 'Emit Gherkin handoff if manifest requires it'
    case 'implement':
      return 'Execute tasks.md under FCIS rules'
    case 'pr-prep':
      return 'hk check --profile pr'
    case 'review':
      return 'Run app-review-handoff on diff'
    case 'gate':
      return 'mise run spec gate + bash gate.sh'
    case 'pr-open':
      return 'gh pr create'
    case 'pr-check':
      return 'gh pr checks --watch --required'
    default:
      return
  }
}

function gateCleared(featureDir: string, gateStage: KitStage): boolean {
  const gatePath = path.join(featureDir, '.gates', `${gateStage}.approved`)
  return existsSync(gatePath)
}

const STAGE_TO_VERB: Record<string, string> = {
  specify: 'specify',
  clarify: 'clarify',
  checklist: 'checklist',
  plan: 'plan',
  'analyze-plan': 'analyze',
  tasks: 'tasks',
  'analyze-tasks': 'analyze',
  'handoff-generate': 'handoff-generate',
  implement: 'implement',
  'pr-prep': 'pr-prep',
  review: 'review',
  gate: 'gate',
  'pr-open': 'pr-open',
  'pr-check': 'pr-check'
}

export function stageToVerb(stage: string): string {
  return STAGE_TO_VERB[stage] ?? stage
}
