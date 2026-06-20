/**
 * spec audit core — deterministic SDD readiness checks for a feature dir.
 *
 * Groups A–E: quartet presence, handoff AC table, tasks hygiene, phase
 * readiness, cross-artifact hints. See assets/guides/SDD_WORKFLOW_GUIDE.md
 * for the full rule table.
 */
import path from 'node:path'
import { detectPhase, parseHandoffAcTable, scanFeatureDir } from '@kb/exec'
import { repoRoot } from '../../support/lib/shared/repo_root.script'
import { readTextFileSync } from '../../support/lib/shared/text_file.script'
import { catalogPaths } from '../support/catalog_paths.script'

export type Severity = 'error' | 'warn' | 'info'

export type Finding = {
  rule: string
  level: Severity
  file: string
  line?: number
  message: string
}

export type AuditResult = {
  featureDir: string
  phase: { name: string; command: string }
  findings: Finding[]
  summary: {
    total: number
    errors: number
    warns: number
    infos: number
  }
}

function slugFromDir(featureDir: string): string {
  return path.basename(featureDir).replace(/^\d+-/, '')
}

function quartetPath(featureDir: string, name: string): string {
  return path.join(featureDir, name)
}

function escapeRegex(raw: string): string {
  return raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

type AcRow = ReturnType<typeof parseHandoffAcTable>[number]

function readHandoffAcRows(handoffPath: string): { md: string; rows: AcRow[] } | null {
  const handoffResult = readTextFileSync(handoffPath)
  if (handoffResult.isErr()) return null
  return { md: handoffResult.value, rows: parseHandoffAcTable(handoffResult.value) }
}

function checkQuartet(featureDir: string): Finding[] {
  const f: Finding[] = []
  const quartet = ['spec.md', 'plan.md', 'tasks.md', 'handoff.md'] as const
  for (const name of quartet) {
    const fp = quartetPath(featureDir, name)
    if (readTextFileSync(fp).isErr()) {
      f.push({
        rule: `quartet.${name.replace('.md', '')}`,
        level: 'error',
        file: fp,
        message: `Missing required quartet file: ${name}`
      })
    }
  }
  const rootPrefix = `${catalogPaths.specs_root}/`
  if (
    featureDir.startsWith(rootPrefix) &&
    !new RegExp(`^${escapeRegex(catalogPaths.specs_root)}/\\d{3,}-[\\w-]+$`).test(featureDir.replace(/\/$/, ''))
  ) {
    f.push({
      rule: 'quartet.path',
      level: 'error',
      file: featureDir,
      message: `Feature dir does not match expected pattern: ${catalogPaths.specs_root}/NNN-<slug>`
    })
  }
  return f
}

function checkHandoffAcTable(handoffPath: string, parsed: { md: string; rows: AcRow[] } | null): Finding[] {
  const f: Finding[] = []
  if (!parsed) return f

  const { md, rows: acRows } = parsed

  const tableLine = md.split('\n').findIndex(l => /^\|\s*ID\s*\|\s*Done when\s*\|\s*Evidence\s*\|/i.test(l))
  if (tableLine < 0) {
    f.push({
      rule: 'handoff.table',
      level: 'error',
      file: handoffPath,
      message: 'No `ID | Done when | Evidence` table header in handoff.md'
    })
  } else if (acRows.length === 0) {
    f.push({
      rule: 'handoff.rows',
      level: 'error',
      file: handoffPath,
      message: 'AC table header present but no data rows parsed'
    })
  }

  for (const row of acRows) {
    if (row.id && !/^[A-Z]+-\d+\s+AC\d+$/i.test(row.id)) {
      f.push({
        rule: 'handoff.id-format',
        level: 'warn',
        file: handoffPath,
        line: 1,
        message: `Unexpected ID format: "${row.id}" (expected PREFIX-n ACm)`
      })
    }
    if (!row.doneWhen) {
      f.push({
        rule: 'handoff.done-when',
        level: 'error',
        file: handoffPath,
        message: `Row "${row.id || '(no ID)'}" has empty Done when`
      })
    }
    if (!row.evidence) {
      f.push({
        rule: 'handoff.evidence',
        level: 'error',
        file: handoffPath,
        message: `Row "${row.id || '(no ID)'}" has empty Evidence`
      })
    } else if (
      !/^`[^`]*`$/.test(row.evidence.trim()) &&
      !/^(?:bun|npm|yarn|pnpm|mise|git|make|docker|npx|gh|aws|cargo|rustup|pip|python|node|curl)\s+\S/i.test(
        row.evidence.trim()
      )
    ) {
      f.push({
        rule: 'handoff.evidence-command',
        level: 'warn',
        file: handoffPath,
        message: `Row "${row.id || '(no ID)'}" has non-command Evidence — expected an executable command`
      })
    }
  }
  return f
}

function checkTasksHygiene(featureDir: string): Finding[] {
  const f: Finding[] = []
  const tasksPath = path.join(featureDir, 'tasks.md')
  const tasksResult = readTextFileSync(tasksPath)
  if (tasksResult.isErr()) return f

  const md = tasksResult.value
  const lines = md.split('\n')

  const hasSampleLeak =
    /\bT001\b/.test(md.replace(/`[^`]*`/g, '')) ||
    /\bSAMPLE TASKS\b/i.test(md) ||
    /illustration purposes only/i.test(md)
  if (hasSampleLeak) {
    f.push({
      rule: 'tasks.sample-leak',
      level: 'error',
      file: tasksPath,
      message: 'Template sample tasks still present (T001, "SAMPLE TASKS", or "illustration purposes only")'
    })
  }

  const isTableFormat = lines.some(l => /^\|.*\|.*\|/.test(l))
  if (!isTableFormat) {
    const hasCheckbox = lines.some(l => /^\s*[-*]\s+\[[ x]\]/.test(l))
    if (!hasCheckbox) {
      f.push({
        rule: 'tasks.checkbox',
        level: 'warn',
        file: tasksPath,
        message: 'No `- [ ]` or `- [x]` task checkbox lines found'
      })
    }

    const hasTaskId = lines.some(l => /\bT\d{3}\b/.test(l))
    if (!hasTaskId) {
      f.push({
        rule: 'tasks.id',
        level: 'warn',
        file: tasksPath,
        message: 'No T### task ID references found (expected from tasks-template)'
      })
    }
  }

  const hasPhase = lines.some(l => /^##\s+Phase\s/i.test(l))
  if (!hasPhase) {
    f.push({
      rule: 'tasks.phases',
      level: 'warn',
      file: tasksPath,
      message: 'No `## Phase` headers found'
    })
  }

  const hasPath = /\b(src\/|tools\/|assets\/|bdd\/|packages\/ops\/)/.test(md)
  if (!hasPath) {
    f.push({
      rule: 'tasks.paths',
      level: 'warn',
      file: tasksPath,
      message: 'No concrete paths (src/, packages/ops/src/, assets/, bdd/) in task descriptions'
    })
  }
  return f
}

function checkPhaseReadiness(featureDir: string): Finding[] {
  const f: Finding[] = []
  const files = scanFeatureDir(featureDir)
  const next = detectPhase(files, featureDir)

  const quartetComplete = files.spec && files.plan && files.tasks && files.handoff

  f.push({
    rule: 'phase.detect',
    level: 'info',
    file: featureDir,
    message: `Current phase: ${next.phase}; suggested command: ${next.command}${next.focusHint ? ` (${next.focusHint})` : ''}`
  })

  if (files.plan && !files.analyzePlanChecklist) {
    f.push({
      rule: 'phase.analyze-plan',
      level: 'warn',
      file: path.join(featureDir, 'checklists/analyze-plan.md'),
      message: 'plan.md exists but no checklists/analyze-plan.md — run plan-pass analyze first'
    })
  }

  if (quartetComplete && next.phase === 'analyze-tasks' && !files.analyzeTasksChecklist) {
    f.push({
      rule: 'phase.analyze-tasks-ready',
      level: 'error',
      file: featureDir,
      message: `Quartet complete but stuck at "analyze-tasks" — run analyze to generate checklists/analyze-tasks.md`
    })
  }

  if (next.command.includes('speckit.implement') && !files.implementComplete && !files.analyzeTasksChecklist) {
    f.push({
      rule: 'phase.implement-premature',
      level: 'warn',
      file: featureDir,
      message: 'Implement suggested but checklists/analyze-tasks.md missing'
    })
  }
  return f
}

function checkCrossRefs(
  featureDir: string,
  handoffPath: string,
  parsed: { md: string; rows: AcRow[] } | null
): Finding[] {
  const f: Finding[] = []
  if (!parsed) return f

  const handoffMd = parsed.md
  const acRows = parsed.rows
  const acIds = acRows.map(r => r.id).filter(Boolean)

  if (acIds.length === 0) return f

  const specPath = path.join(featureDir, 'spec.md')
  const tasksPath = path.join(featureDir, 'tasks.md')

  const specResult = readTextFileSync(specPath)
  const tasksResult = readTextFileSync(tasksPath)
  const specContent = specResult.isOk() ? specResult.value : ''
  const tasksContent = tasksResult.isOk() ? tasksResult.value : ''

  for (const id of acIds) {
    const specId = id.split(' ')[0] ?? ''
    const specFound = specContent.includes(specId)
    const tasksFound = tasksContent.includes(specId)

    if (!specFound && !tasksFound) {
      f.push({
        rule: 'xref.handoff-spec',
        level: 'warn',
        file: handoffPath,
        message: `AC ID "${id}" not found in spec.md or tasks.md`
      })
    }
  }

  const slug = slugFromDir(featureDir)
  const specRelPath = featureDir.startsWith(`${catalogPaths.specs_root}/`)
    ? featureDir.slice(featureDir.indexOf(catalogPaths.specs_root))
    : path.isAbsolute(featureDir)
      ? path.relative(path.join(repoRoot(), catalogPaths.specs_root), featureDir).replace(/^\.\.\//, '')
      : featureDir
  if (slug && !handoffMd.toLowerCase().includes(slug.toLowerCase()) && !handoffMd.includes(specRelPath)) {
    f.push({
      rule: 'xref.tasks-handoff',
      level: 'warn',
      file: handoffPath,
      message: `handoff.md does not mention feature slug "${slug}" or spec path`
    })
  }
  return f
}

export function runAudit(featureDir: string): AuditResult {
  const aFindings = checkQuartet(featureDir)
  const handoffPath = path.join(featureDir, 'handoff.md')
  const handoffParsed = readHandoffAcRows(handoffPath)
  const bFindings = checkHandoffAcTable(handoffPath, handoffParsed)
  const cFindings = checkTasksHygiene(featureDir)
  const dFindings = checkPhaseReadiness(featureDir)
  const eFindings = checkCrossRefs(featureDir, handoffPath, handoffParsed)

  const findings = [...aFindings, ...bFindings, ...cFindings, ...dFindings, ...eFindings]

  const errors = findings.filter(f => f.level === 'error').length
  const warns = findings.filter(f => f.level === 'warn').length
  const infos = findings.filter(f => f.level === 'info').length

  const phaseFind = findings.find(f => f.rule === 'phase.detect')
  const phase = phaseFind
    ? {
        name: phaseFind.message.match(/Current phase: ([\w-]+)/)?.[1] ?? 'unknown',
        command: phaseFind.message.match(/suggested command: ([^\s)]+)/)?.[1] ?? ''
      }
    : { name: 'unknown', command: '' }

  return {
    featureDir,
    phase,
    findings,
    summary: { total: findings.length, errors, warns, infos }
  }
}
