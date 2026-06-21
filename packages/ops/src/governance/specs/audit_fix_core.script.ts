/**
 * Deterministic auto-scaffolding for spec audit findings (brainstorm → speckit bridge).
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { parseHandoffAcTable } from '@kb/exec'
import { readTextFileSync } from '../../support/lib/shared/text_file.script'
import { type Finding, runAudit } from './audit_core.script'
import { renderHandoffFromSpec } from './spec_parse.script'

export type FixAction = {
  rule: string
  file: string
  action: 'create' | 'patch'
  summary: string
}

export type FixSkip = {
  rule: string
  reason: string
}

export type FixResult = {
  actions: FixAction[]
  skipped: FixSkip[]
}

export type FixOpts = {
  force?: boolean
}

const TASK_ID_RE = /\*\*T(\d+)\*\*/g
const TEMPLATE_COMMENT_RE = /<!--[\s\S]*?IMPORTANT:[\s\S]*?illustration purposes only[\s\S]*?-->/gi
const SAMPLE_TASKS_RE = /\bSAMPLE TASKS\b/i
const ILLUSTRATION_RE = /illustration purposes only/i

function slugTitle(featureDir: string): string {
  return path.basename(featureDir).replace(/^\d+-/, '').replace(/-/g, ' ')
}

function featureFolderName(featureDir: string): string {
  return path.basename(featureDir)
}

function handoffNeedsScaffold(featureDir: string, force: boolean): boolean {
  const handoffPath = path.join(featureDir, 'handoff.md')
  if (!existsSync(handoffPath)) return true
  if (force) return true
  const parsed = readTextFileSync(handoffPath)
  if (parsed.isErr()) return true
  const rows = parseHandoffAcTable(parsed.value)
  return rows.length === 0
}

function planHandoffFix(featureDir: string, findings: Finding[], opts: FixOpts): FixAction | FixSkip | null {
  const rules = new Set(findings.map(f => f.rule))
  const auditNeeds =
    rules.has('quartet.handoff') ||
    rules.has('handoff.table') ||
    rules.has('handoff.rows') ||
    findings.some(f => f.rule.startsWith('handoff.') && f.level === 'error')

  const handoffPath = path.join(featureDir, 'handoff.md')
  const hasRows = existsSync(handoffPath) && !handoffNeedsScaffold(featureDir, false)

  if (!auditNeeds && !(opts.force && existsSync(handoffPath))) return null

  if (hasRows && !opts.force) {
    return { rule: 'quartet.handoff', reason: 'handoff.md already has AC rows (use --force to overwrite)' }
  }

  return {
    rule: 'quartet.handoff',
    file: handoffPath,
    action: existsSync(handoffPath) ? 'patch' : 'create',
    summary: 'Scaffold handoff.md AC table from spec.md Evidence lines'
  }
}

function renumberTaskIds(md: string): { text: string; changed: boolean } {
  const matches = [...md.matchAll(TASK_ID_RE)]
  if (matches.length === 0) return { text: md, changed: false }

  const needsRenumber = matches.some(m => {
    const n = Number.parseInt(m[1] ?? '0', 10)
    return n < 100 || (m[1]?.length ?? 0) < 3
  })
  if (!needsRenumber && !/\bT001\b/.test(md)) return { text: md, changed: false }

  let seq = 100
  const seen = new Map<string, string>()
  const text = md.replace(TASK_ID_RE, (_full, digits: string) => {
    const key = digits
    if (seen.has(key)) return `**${seen.get(key)}**`
    seq += 1
    const next = `T${seq}`
    seen.set(key, next)
    return `**${next}**`
  })
  return { text, changed: text !== md }
}

function stripTemplateLeak(md: string): string {
  let out = md.replace(TEMPLATE_COMMENT_RE, '')
  if (SAMPLE_TASKS_RE.test(out) || ILLUSTRATION_RE.test(out)) {
    out = out
      .split('\n')
      .filter(line => !SAMPLE_TASKS_RE.test(line) && !ILLUSTRATION_RE.test(line))
      .join('\n')
  }
  return out
}

function planCloseoutTaskFix(featureDir: string): FixAction | null {
  const tasksPath = path.join(featureDir, 'tasks.md')
  const tasksResult = readTextFileSync(tasksPath)
  if (tasksResult.isErr()) return null
  const md = tasksResult.value
  if (/\*\*T199\*\*/.test(md)) return null
  if (!/\*\*T1\d{2}\*\*/.test(md)) return null
  if (/\bspec ready\b/i.test(md) || /\bspec gate\b/i.test(md)) return null

  return {
    rule: 'tasks.closeout-missing',
    file: tasksPath,
    action: 'patch',
    summary: 'Append T199 closeout task (spec closeout + optional --commit)'
  }
}

function readTasksTextOrThrow(featureDir: string): { tasksPath: string; text: string } {
  const tasksPath = path.join(featureDir, 'tasks.md')
  const tasksResult = readTextFileSync(tasksPath)
  if (tasksResult.isErr()) throw new Error(`cannot read ${tasksPath}`)
  return { tasksPath, text: tasksResult.value }
}

function applyCloseoutTaskFix(featureDir: string): void {
  const { tasksPath, text } = readTasksTextOrThrow(featureDir)
  const rel = featureDir.replace(/\\/g, '/')
  const block = `

## Closeout

- [ ] **T199** Run \`mise run spec closeout ${rel}\` (or \`spec ready\` without evidence replay); pass \`--commit\` when the operator wants a closeout commit — *gate:* DoD merge
`
  writeFileSync(tasksPath, `${text.trimEnd()}${block}`, 'utf8')
}

function planTasksFix(featureDir: string, findings: Finding[]): FixAction | null {
  const rules = new Set(findings.map(f => f.rule))
  if (!rules.has('tasks.id') && !rules.has('tasks.sample-leak')) return null

  const tasksPath = path.join(featureDir, 'tasks.md')
  const tasksResult = readTextFileSync(tasksPath)
  if (tasksResult.isErr()) return null

  const { text: renumbered, changed: idChanged } = renumberTaskIds(tasksResult.value)
  const stripped = stripTemplateLeak(renumbered)
  if (!idChanged && stripped === tasksResult.value && !rules.has('tasks.sample-leak')) return null

  return {
    rule: rules.has('tasks.sample-leak') ? 'tasks.sample-leak' : 'tasks.id',
    file: tasksPath,
    action: 'patch',
    summary: 'Renumber task IDs to T101+ and strip template sample leakage'
  }
}

function planChecklistFix(
  featureDir: string,
  rule: 'phase.analyze-plan' | 'phase.analyze-tasks-ready',
  findings: Finding[],
  opts: FixOpts
): FixAction | FixSkip | null {
  if (!findings.some(f => f.rule === rule)) return null

  const fileName = rule === 'phase.analyze-plan' ? 'analyze-plan.md' : 'analyze-tasks.md'
  const checklistPath = path.join(featureDir, 'checklists', fileName)
  if (existsSync(checklistPath) && !opts.force) {
    return { rule, reason: `${fileName} already exists (use --force to overwrite)` }
  }

  return {
    rule,
    file: checklistPath,
    action: existsSync(checklistPath) ? 'patch' : 'create',
    summary: `Scaffold checklists/${fileName} stub`
  }
}

export function planFixes(featureDir: string, opts: FixOpts = {}): FixResult {
  const audit = runAudit(featureDir)
  const actions: FixAction[] = []
  const skipped: FixSkip[] = []

  const handoff = planHandoffFix(featureDir, audit.findings, opts)
  if (handoff) {
    if ('summary' in handoff) actions.push(handoff)
    else skipped.push(handoff)
  }

  const tasks = planTasksFix(featureDir, audit.findings)
  if (tasks) actions.push(tasks)

  const closeout = planCloseoutTaskFix(featureDir)
  if (closeout) actions.push(closeout)

  for (const rule of ['phase.analyze-plan', 'phase.analyze-tasks-ready'] as const) {
    const checklist = planChecklistFix(featureDir, rule, audit.findings, opts)
    if (checklist) {
      if ('summary' in checklist) actions.push(checklist)
      else skipped.push(checklist)
    }
  }

  return { actions, skipped }
}

function renderAnalyzePlanChecklist(featureDir: string): string {
  const title = slugTitle(featureDir)
  const folder = featureFolderName(featureDir)
  const today = new Date().toISOString().slice(0, 10)
  return `# Plan Analysis Checklist: ${title}

**Purpose**: Verification of plan design, constraints, and constitution alignment for ${title}.
**Created**: ${today}
**Feature**: [spec.md](../spec.md)

## Design Checklist

- [ ] CHK001 Verify all merged modules have co-located specs.
- [ ] CHK002 Verify no rule files are edited (except \`.ls-lint.yml\` additively when spec allows).
- [ ] CHK003 Verify barrel exports remain identical where applicable.
- [ ] CHK004 Verify behaviour is frozen and existing specs pass.
- [ ] CHK005 Verify suffix discipline is maintained.

<!-- scaffold from spec conform (${folder}); refine via /speckit-analyze plan pass -->
`
}

function renderAnalyzeTasksChecklist(featureDir: string): string {
  const title = slugTitle(featureDir)
  const folder = featureFolderName(featureDir)
  const today = new Date().toISOString().slice(0, 10)
  return `# Tasks Analysis Checklist: ${title}

**Purpose**: Verification of task coverage, baseline metrics, and dependencies.
**Created**: ${today}
**Feature**: [spec.md](../spec.md)

## Tasks Checklist

- [ ] CHK001 Verify all spec requirements map to at least one task.
- [ ] CHK002 Verify baseline metrics capture task exists.
- [ ] CHK003 Verify closeout metrics verification task exists.
- [ ] CHK004 Verify phase dependencies follow correct execution order.

<!-- scaffold from spec conform (${folder}); refine via /speckit-analyze tasks pass -->
`
}

function applyHandoffFix(featureDir: string): void {
  const specPath = path.join(featureDir, 'spec.md')
  const specResult = readTextFileSync(specPath)
  if (specResult.isErr()) throw new Error(`cannot read ${specPath}`)
  const content = renderHandoffFromSpec(specResult.value, featureFolderName(featureDir))
  writeFileSync(path.join(featureDir, 'handoff.md'), content, 'utf8')
}

function applyTasksFix(featureDir: string): void {
  const { tasksPath, text } = readTasksTextOrThrow(featureDir)
  const stripped = stripTemplateLeak(text)
  const { text: renumbered } = renumberTaskIds(stripped)
  writeFileSync(tasksPath, renumbered, 'utf8')
}

function applyChecklistFix(featureDir: string, rule: 'phase.analyze-plan' | 'phase.analyze-tasks-ready'): void {
  const dir = path.join(featureDir, 'checklists')
  mkdirSync(dir, { recursive: true })
  const content =
    rule === 'phase.analyze-plan' ? renderAnalyzePlanChecklist(featureDir) : renderAnalyzeTasksChecklist(featureDir)
  const fileName = rule === 'phase.analyze-plan' ? 'analyze-plan.md' : 'analyze-tasks.md'
  writeFileSync(path.join(dir, fileName), content, 'utf8')
}

export function applyFixes(featureDir: string, plan: FixResult): void {
  for (const action of plan.actions) {
    if (action.rule === 'quartet.handoff' || action.rule.startsWith('handoff.')) {
      applyHandoffFix(featureDir)
      continue
    }
    if (action.rule === 'tasks.id' || action.rule === 'tasks.sample-leak') {
      applyTasksFix(featureDir)
      continue
    }
    if (action.rule === 'tasks.closeout-missing') {
      applyCloseoutTaskFix(featureDir)
      continue
    }
    if (action.rule === 'phase.analyze-plan' || action.rule === 'phase.analyze-tasks-ready') {
      applyChecklistFix(featureDir, action.rule)
    }
  }
}

export function runConform(
  featureDir: string,
  opts: FixOpts & { dryRun?: boolean } = {}
): {
  before: ReturnType<typeof runAudit>
  after: ReturnType<typeof runAudit>
  plan: FixResult
} {
  const before = runAudit(featureDir)
  let plan = planFixes(featureDir, opts)
  if (!opts.dryRun) {
    for (let pass = 0; pass < 3 && plan.actions.length > 0; pass++) {
      applyFixes(featureDir, plan)
      plan = planFixes(featureDir, opts)
    }
  }
  const after = opts.dryRun ? before : runAudit(featureDir)
  return { before, after, plan }
}
