/**
 * spec audit core — deterministic SDD readiness checks for a feature dir.
 *
 * Groups A–E: quartet presence, handoff AC table, tasks hygiene, phase
 * readiness, cross-artifact hints. See assets/specs/_handoffs/ for the
 * full rule table.
 */
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { parseHandoffAcTable } from './workflow/handoff_generate.script.ts'
import { detectPhase, scanFeatureDir } from './workflow/orchestrated_handoff.script.ts'

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

function checkQuartet(featureDir: string): Finding[] {
  const f: Finding[] = []
  const quartet = ['spec.md', 'plan.md', 'tasks.md', 'handoff.md'] as const
  for (const name of quartet) {
    const fp = quartetPath(featureDir, name)
    if (!existsSync(fp)) {
      f.push({
        rule: `quartet.${name.replace('.md', '')}`,
        level: 'error',
        file: fp,
        message: `Missing required quartet file: ${name}`
      })
    }
  }
  if (featureDir.includes('assets/specs/') && !/assets\/specs\/\d{3,}-[\w-]+$/.test(featureDir.replace(/\/$/, ''))) {
    f.push({
      rule: 'quartet.path',
      level: 'error',
      file: featureDir,
      message: 'Feature dir does not match expected pattern: assets/specs/NNN-<slug>'
    })
  }
  return f
}

function checkHandoffAcTable(featureDir: string): Finding[] {
  const f: Finding[] = []
  const handoffPath = path.join(featureDir, 'handoff.md')
  if (!existsSync(handoffPath)) return f

  const md = readFileSync(handoffPath, 'utf-8')
  const acRows = parseHandoffAcTable(md)

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
  if (!existsSync(tasksPath)) return f

  const md = readFileSync(tasksPath, 'utf-8')
  const lines = md.split('\n')

  const hasSampleLeak = /\bT001\b/.test(md) || /\bSAMPLE TASKS\b/i.test(md) || /illustration purposes only/i.test(md)
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

  const hasPath = /\b(src\/|tools\/|assets\/|bdd\/)/.test(md)
  if (!hasPath) {
    f.push({
      rule: 'tasks.paths',
      level: 'warn',
      file: tasksPath,
      message: 'No concrete paths (src/, tools/, assets/, bdd/) in task descriptions'
    })
  }
  return f
}

function checkPhaseReadiness(featureDir: string): Finding[] {
  const f: Finding[] = []
  const files = scanFeatureDir(featureDir)
  const next = detectPhase(files, featureDir)

  const quartetComplete = files.spec && files.plan && files.tasks && files.handoff

  // Group D rules
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

function checkCrossRefs(featureDir: string): Finding[] {
  const f: Finding[] = []
  const handoffPath = path.join(featureDir, 'handoff.md')

  if (!existsSync(handoffPath)) return f

  const handoffMd = readFileSync(handoffPath, 'utf-8')
  const acRows = parseHandoffAcTable(handoffMd)
  const acIds = acRows.map(r => r.id).filter(Boolean)

  if (acIds.length === 0) return f

  const specPath = path.join(featureDir, 'spec.md')
  const tasksPath = path.join(featureDir, 'tasks.md')

  for (const id of acIds) {
    const specId = id.split(' ')[0] ?? ''
    const specFound = existsSync(specPath) && readFileSync(specPath, 'utf-8').includes(specId)
    const tasksFound = existsSync(tasksPath) && readFileSync(tasksPath, 'utf-8').includes(specId)

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
  const specRelPath = featureDir.includes('assets/specs/')
    ? featureDir.slice(featureDir.indexOf('assets/specs/'))
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
  const bFindings = checkHandoffAcTable(featureDir)
  const cFindings = checkTasksHygiene(featureDir)
  const dFindings = checkPhaseReadiness(featureDir)
  const eFindings = checkCrossRefs(featureDir)

  const findings = [...aFindings, ...bFindings, ...cFindings, ...dFindings, ...eFindings]

  const errors = findings.filter(f => f.level === 'error').length
  const warns = findings.filter(f => f.level === 'warn').length
  const infos = findings.filter(f => f.level === 'info').length

  // Extract phase info from phase.detect finding
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
