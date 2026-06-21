/**
 * Pure SDD workflow progress derivation.
 *
 * Given a scanned `FileSet`, optional pre-read markdown (tasks/handoff/plan),
 * and catalog metadata, `deriveWorkflowProgress` builds a six-column
 * `WorkflowProgressReport` describing where a feature sits in the SDD pipeline.
 *
 * Pure: no filesystem I/O. The caller (ops CLI layer) reads files and passes
 * contents in. Phase detection reuses `detectPhase` from
 * `orchestrated_handoff.script.ts` (normative source of phase order).
 *
 * See `.cursor/plans/spec_workflow_status_deepseek_handoff.md`.
 */
import path from 'node:path'
import { buildSubtaskManifest, detectPhase, type FileSet, type ManifestProbe } from './orchestrated_handoff.script'

export type { FileSet } from './orchestrated_handoff.script'

export type StageStatus = 'done' | 'current' | 'pending' | 'skipped'

export type NodeStatus = StageStatus | 'debt'

export type WorkflowNodeKind = 'command' | 'artifact' | 'task' | 'mise'

export type WorkflowNode = {
  kind: WorkflowNodeKind
  label: string
  status: NodeStatus
  path?: string
}

export type WorkflowColumnId = 'intent' | 'design' | 'breakdown' | 'dispatch' | 'build' | 'ship'

export type WorkflowColumn = {
  id: WorkflowColumnId
  title: string
  groupColor: string
  rail: WorkflowNode
  stack: WorkflowNode[]
}

export type ArtifactDebt = {
  path: string
  blockedAt: string
  note: string
  unblockCommand?: string
}

export type TaskProgress = { id: string; done: boolean; text?: string }

export type CommitChunkProgress = { id: string; subject?: string; paths: string[] }

export type WorkflowProgressReport = {
  featureDir: string
  slug: string
  catalogKey: string | null
  catalogStatus: 'shipped' | 'in-progress' | null
  currentPhase: string
  next: { command: string; focusHint?: string; phase: string }
  columns: WorkflowColumn[]
  artifactDebt: ArtifactDebt[]
  tasks: TaskProgress[]
  commitChunks: CommitChunkProgress[]
  lifecycleMismatch?: boolean
}

export type DeriveWorkflowProgressInput = {
  featureDir: string
  files: FileSet
  /** Pre-read tasks.md content for T### checkbox parsing. */
  tasksMd?: string
  /** Pre-read handoff.md content; used to derive the manifest probe. */
  handoffMd?: string
  /** Pre-read plan.md content; used to derive the manifest probe. */
  planMd?: string | null
  /**
   * Pre-computed manifest probe result. When omitted, the probe is derived
   * from `handoffMd`/`planMd` via `buildSubtaskManifest` (pure). Pass `false`
   * to force-skip the dispatch column.
   */
  manifestNeedsHandoff?: boolean
  catalogKey?: string | null
  catalogStatus?: 'shipped' | 'in-progress' | null
  /** Pre-parsed commit plan chunks (parsed in ops layer; exec stays pure). */
  commitChunks?: CommitChunkProgress[]
}

const RE_LEADING_DIGITS = /^\d+-/

export function slugFromDir(featureDir: string): string {
  return path.basename(featureDir).replace(RE_LEADING_DIGITS, '')
}

const GROUP_COLORS: Record<WorkflowColumnId, string> = {
  intent: '#5ecfbe',
  design: '#3399ff',
  breakdown: '#ddb7ff',
  dispatch: '#f59e0b',
  build: '#5ecfbe',
  ship: '#ff6b9d'
}

/** Stage order mirrors `detectPhase` transitions (normative). */
const PHASE_ORDER = [
  'specify',
  'plan',
  'analyze-plan',
  'tasks',
  'analyze-tasks',
  'handoff-generate',
  'implement',
  'gate'
] as const

type PhaseName = (typeof PHASE_ORDER)[number]

/** Phase-order thresholds used by `clearedStages`. */
const STAGE = {
  SPECIFY: 0,
  PLAN: 1,
  ANALYZE_PLAN: 2,
  TASKS: 3,
  ANALYZE_TASKS: 4,
  HANDOFF_GENERATE: 5,
  IMPLEMENT: 6
} as const

/** Six-column layout indices. */
const COL = {
  INTENT: 0,
  DESIGN: 1,
  BREAKDOWN: 2,
  DISPATCH: 3,
  BUILD: 4,
  SHIP: 5
} as const

/** Maximum task rows rendered in the build column before a "… +N more" row. */
const MAX_TASK_ROWS = 12

const RE_TASK_CHECKBOX = /^\s*[-*]\s+\[( |x)\]\s+\*\*(T\d{3})\*\*(.*)$/i
const RE_TASK_TEXT_PREFIX = /^[\s—–-]+/

function phaseIndex(phase: string): number {
  const idx = PHASE_ORDER.indexOf(phase as PhaseName)
  return idx < 0 ? 0 : idx
}

/** Map a phase to the column index that owns it. */
function phaseColumnIndex(phase: string): number {
  switch (phase) {
    case 'specify':
      return COL.INTENT
    case 'plan':
    case 'analyze-plan':
      return COL.DESIGN
    case 'tasks':
    case 'analyze-tasks':
      return COL.BREAKDOWN
    case 'handoff-generate':
      return COL.DISPATCH
    case 'implement':
      return COL.BUILD
    case 'gate':
      return COL.SHIP
    default:
      return COL.INTENT
  }
}

/**
 * Derive whether the subtask manifest needs a `gherkin-bdd-handoff` dispatch.
 * Pure: reads only the supplied markdown. When handoff/plan are unavailable,
 * defaults to `true` (matches `detectPhase` default probe).
 */
export function deriveManifestNeedsHandoff(input: {
  featureDir: string
  slug: string
  handoffMd?: string
  planMd?: string | null
}): boolean {
  if (!input.handoffMd) return true
  const subtasks = buildSubtaskManifest({
    featureDir: input.featureDir,
    slug: input.slug,
    handoffMd: input.handoffMd,
    planMd: input.planMd ?? null
  })
  return subtasks.some(s => s.type === 'gherkin-bdd-handoff')
}

/**
 * Parse T### task checkboxes from tasks.md. `- [x] **T101**` → done;
 * `- [ ] **T101**` → incomplete. Non-T### checkboxes are ignored.
 */
export function parseTaskCheckboxes(tasksMd: string): TaskProgress[] {
  const tasks: TaskProgress[] = []
  for (const line of tasksMd.split('\n')) {
    const m = line.match(RE_TASK_CHECKBOX)
    if (!m) continue
    const done = m[1]?.toLowerCase() === 'x'
    const id = (m[2] ?? '').toUpperCase()
    const rest = (m[3] ?? '').trim()
    const text = rest.replace(RE_TASK_TEXT_PREFIX, '').trim() || undefined
    tasks.push({ id, done, text })
  }
  return tasks
}

type ClearedStages = {
  specify: boolean
  plan: boolean
  analyzePlan: boolean
  tasks: boolean
  analyzeTasks: boolean
  handoffGenerate: boolean
  implement: boolean
}

/**
 * A stage is cleared only when `detectPhase` has moved past it. Phase order is
 * normative; computing from FileSet alone would ignore ordering (e.g. tasks.md
 * existing while still in analyze-plan must NOT clear the tasks stage). The
 * handoff-generate stage is treated as cleared when skipped.
 */
function clearedStages(currentPhase: string): ClearedStages {
  const idx = phaseIndex(currentPhase)
  return {
    specify: idx > STAGE.SPECIFY,
    plan: idx > STAGE.PLAN,
    analyzePlan: idx > STAGE.ANALYZE_PLAN,
    tasks: idx > STAGE.TASKS,
    analyzeTasks: idx > STAGE.ANALYZE_TASKS,
    handoffGenerate: idx > STAGE.HANDOFF_GENERATE,
    implement: idx > STAGE.IMPLEMENT
  }
}

/** A node is `debt` when its file exists on disk but the owning stage gate is not cleared. */
function artifactStatus(filePresent: boolean, stageCleared: boolean): NodeStatus {
  if (stageCleared) return 'done'
  if (filePresent) return 'debt'
  return 'pending'
}

/**
 * handoff.md is premature debt only after analyze-plan clears and before
 * analyze-tasks clears — same gate as `deriveArtifactDebt`.
 */
function handoffArtifactStageCleared(cleared: ClearedStages): boolean {
  return !cleared.analyzePlan || cleared.analyzeTasks
}

function handoffPrematureDebt(files: FileSet, cleared: ClearedStages): boolean {
  return Boolean(files.handoff && cleared.analyzePlan && !cleared.analyzeTasks)
}

function railStatus(stageCleared: boolean, currentColumn: boolean): NodeStatus {
  if (stageCleared) return 'done'
  if (currentColumn) return 'current'
  return 'pending'
}

function buildIntentColumn(cleared: ClearedStages, currentColumn: boolean): WorkflowColumn {
  const railStatusVal = railStatus(cleared.specify, currentColumn)
  const specStatus: NodeStatus = cleared.specify ? 'done' : currentColumn ? 'current' : 'pending'
  return {
    id: 'intent',
    title: '1 · Intent',
    groupColor: GROUP_COLORS.intent,
    rail: { kind: 'command', label: '/speckit-specify', status: railStatusVal },
    stack: [{ kind: 'artifact', label: 'spec.md', status: specStatus, path: 'spec.md' }]
  }
}

function buildDesignColumn(
  files: FileSet,
  cleared: ClearedStages,
  currentColumn: boolean,
  currentPhase: string
): WorkflowColumn {
  const railStatusVal = railStatus(cleared.plan, currentColumn)
  const analyzePlanArtifact = artifactStatus(files.analyzePlanChecklist, cleared.analyzePlan)
  const analyzeCommandStatus: NodeStatus = cleared.analyzePlan
    ? 'done'
    : currentPhase === 'analyze-plan'
      ? 'current'
      : 'pending'
  return {
    id: 'design',
    title: '2 · Design',
    groupColor: GROUP_COLORS.design,
    rail: { kind: 'command', label: '/speckit-plan', status: railStatusVal },
    stack: [
      {
        kind: 'artifact',
        label: 'plan.md',
        status: cleared.plan ? 'done' : files.plan ? 'debt' : 'pending',
        path: 'plan.md'
      },
      {
        kind: 'artifact',
        label: 'checklists/analyze-plan.md',
        status: analyzePlanArtifact,
        path: 'checklists/analyze-plan.md'
      },
      { kind: 'command', label: '/speckit-analyze', status: analyzeCommandStatus },
      { kind: 'command', label: '/speckit-clarify', status: 'pending' }
    ]
  }
}

function buildBreakdownColumn(
  files: FileSet,
  cleared: ClearedStages,
  currentColumn: boolean,
  currentPhase: string
): WorkflowColumn {
  const railStatusVal = railStatus(cleared.tasks, currentColumn)
  const tasksStatus = artifactStatus(files.tasks, cleared.tasks)
  const handoffStatus = artifactStatus(files.handoff, handoffArtifactStageCleared(cleared))
  const analyzeTasksArtifact = artifactStatus(files.analyzeTasksChecklist, cleared.analyzeTasks)
  const analyzeCommandStatus: NodeStatus = cleared.analyzeTasks
    ? 'done'
    : currentPhase === 'analyze-tasks'
      ? 'current'
      : 'pending'
  return {
    id: 'breakdown',
    title: '3 · Breakdown',
    groupColor: GROUP_COLORS.breakdown,
    rail: { kind: 'command', label: '/speckit-tasks', status: railStatusVal },
    stack: [
      { kind: 'artifact', label: 'tasks.md', status: tasksStatus, path: 'tasks.md' },
      { kind: 'artifact', label: 'handoff.md', status: handoffStatus, path: 'handoff.md' },
      {
        kind: 'artifact',
        label: 'checklists/analyze-tasks.md',
        status: analyzeTasksArtifact,
        path: 'checklists/analyze-tasks.md'
      },
      { kind: 'command', label: '/speckit-analyze', status: analyzeCommandStatus },
      { kind: 'mise', label: 'mise run spec conform', status: 'pending' }
    ]
  }
}

function buildDispatchColumn(
  cleared: ClearedStages,
  currentColumn: boolean,
  manifestNeedsHandoff: boolean,
  slug: string
): WorkflowColumn {
  const gherkinPath = `tmp/handoffs/opencode-${slug}-gherkin.md`
  let railStatusVal: NodeStatus
  let artifactStatusVal: NodeStatus
  if (!manifestNeedsHandoff) {
    railStatusVal = 'skipped'
    artifactStatusVal = 'skipped'
  } else if (cleared.handoffGenerate) {
    railStatusVal = 'done'
    artifactStatusVal = 'done'
  } else if (currentColumn) {
    railStatusVal = 'current'
    artifactStatusVal = 'current'
  } else {
    railStatusVal = 'pending'
    artifactStatusVal = 'pending'
  }
  return {
    id: 'dispatch',
    title: '4 · Dispatch',
    groupColor: GROUP_COLORS.dispatch,
    rail: { kind: 'command', label: 'mise run spec workflow handoff generate --focus gherkin', status: railStatusVal },
    stack: [
      {
        kind: 'artifact',
        label: gherkinPath,
        status: artifactStatusVal,
        path: gherkinPath
      }
    ]
  }
}

function buildBuildColumn(
  files: FileSet,
  cleared: ClearedStages,
  currentColumn: boolean,
  currentPhase: string,
  tasks: TaskProgress[]
): WorkflowColumn {
  const railStatusVal = railStatus(cleared.implement, currentColumn)
  const implementDoneStatus = artifactStatus(files.implementComplete, cleared.implement)
  const stack: WorkflowNode[] = []
  const inImplement = currentPhase === 'implement'
  let sawCurrent = false
  const tasksShown = tasks.slice(0, MAX_TASK_ROWS)
  for (const t of tasksShown) {
    let status: NodeStatus
    if (t.done) {
      status = 'done'
    } else if (inImplement && !sawCurrent) {
      status = 'current'
      sawCurrent = true
    } else {
      status = 'pending'
    }
    stack.push({
      kind: 'task',
      label: t.text ? `${t.id} ${t.text}` : t.id,
      status
    })
  }
  if (tasks.length > MAX_TASK_ROWS) {
    stack.push({ kind: 'task', label: `… +${tasks.length - MAX_TASK_ROWS} more`, status: 'pending' })
  }
  stack.push({
    kind: 'artifact',
    label: 'checklists/implement-done.md',
    status: implementDoneStatus,
    path: 'checklists/implement-done.md'
  })
  stack.push({
    kind: 'mise',
    label: 'mise run spec ready --phase Cn --commit',
    status: inImplement ? 'current' : 'pending'
  })
  return {
    id: 'build',
    title: '5 · Build',
    groupColor: GROUP_COLORS.build,
    rail: { kind: 'command', label: '/speckit-implement', status: railStatusVal },
    stack
  }
}

function buildShipColumn(currentColumn: boolean): WorkflowColumn {
  const railStatusVal: NodeStatus = currentColumn ? 'current' : 'pending'
  return {
    id: 'ship',
    title: '6 · Ship',
    groupColor: GROUP_COLORS.ship,
    rail: { kind: 'mise', label: 'mise run spec gate {dir}', status: railStatusVal },
    stack: [
      { kind: 'mise', label: 'mise run spec closeout {dir} --commit', status: 'pending' },
      { kind: 'mise', label: 'mise run catalog promote {key}', status: 'pending' }
    ]
  }
}

function deriveArtifactDebt(files: FileSet, cleared: ClearedStages, featureDir: string): ArtifactDebt[] {
  const debt: ArtifactDebt[] = []
  // tasks.md exists but analyze-plan gate not cleared → debt blocked at analyze-plan.
  if (files.tasks && !cleared.analyzePlan) {
    debt.push({
      path: 'tasks.md',
      blockedAt: 'analyze-plan',
      note: 'tasks.md exists before analyze-plan checklist',
      unblockCommand: `/speckit-analyze ${featureDir}`
    })
  }
  // handoff.md exists but analyze-tasks gate not cleared (only when analyze-plan is done).
  if (handoffPrematureDebt(files, cleared)) {
    debt.push({
      path: 'handoff.md',
      blockedAt: 'analyze-tasks',
      note: 'handoff.md exists before analyze-tasks checklist',
      unblockCommand: `/speckit-analyze ${featureDir}`
    })
  }
  return debt
}

/**
 * Build a six-column `WorkflowProgressReport` for the given feature state.
 * Pure — no I/O. Callers read files and pass `FileSet` + markdown contents.
 */
export function deriveWorkflowProgress(input: DeriveWorkflowProgressInput): WorkflowProgressReport {
  const { featureDir, files } = input
  const slug = slugFromDir(featureDir)
  const manifestNeedsHandoff =
    input.manifestNeedsHandoff ??
    deriveManifestNeedsHandoff({ featureDir, slug, handoffMd: input.handoffMd, planMd: input.planMd })
  const probe: ManifestProbe = () => manifestNeedsHandoff
  const next = detectPhase(files, featureDir, probe)
  const currentPhase = next.phase
  const cleared = clearedStages(currentPhase)
  const currentColIdx = phaseColumnIndex(currentPhase)

  const tasks = input.tasksMd ? parseTaskCheckboxes(input.tasksMd) : []

  const columns: WorkflowColumn[] = [
    buildIntentColumn(cleared, currentColIdx === COL.INTENT),
    buildDesignColumn(files, cleared, currentColIdx === COL.DESIGN, currentPhase),
    buildBreakdownColumn(files, cleared, currentColIdx === COL.BREAKDOWN, currentPhase),
    buildDispatchColumn(cleared, currentColIdx === COL.DISPATCH, manifestNeedsHandoff, slug),
    buildBuildColumn(files, cleared, currentColIdx === COL.BUILD, currentPhase, tasks),
    buildShipColumn(currentColIdx === COL.SHIP)
  ]

  const artifactDebt = deriveArtifactDebt(files, cleared, featureDir)

  const catalogKey = input.catalogKey ?? null
  const catalogStatus = input.catalogStatus ?? null
  const lifecycleMismatch = catalogStatus === 'shipped' && currentPhase !== 'gate' ? true : undefined

  return {
    featureDir,
    slug,
    catalogKey,
    catalogStatus,
    currentPhase,
    next: { command: next.command, focusHint: next.focusHint, phase: next.phase },
    columns,
    artifactDebt,
    tasks,
    commitChunks: input.commitChunks ?? [],
    lifecycleMismatch
  }
}
