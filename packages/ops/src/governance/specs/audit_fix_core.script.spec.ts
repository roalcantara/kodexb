import { describe, expect, it } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { runAudit } from './audit_core.script'
import { applyFixes, planFixes, runConform } from './audit_fix_core.script'

const NO_T001 = /\bT001\b/

const MINIMAL_SPEC = `# Demo feature

## REQUIREMENT COH-1: Logging regroup

**User story:** As a developer, I want cohesive logging modules.

1. WHEN COH-1 lands, THEN RPC plugins SHALL merge into rpc.plugin.ts.
   - **Measure:** file count
   - **Evidence:** \`bun test src/shared/logging\`

## REQUIREMENT COH-2: Merges

**User story:** As a developer, I want fewer files.

1. WHEN COH-2 lands, THEN helpers SHALL be encapsulated.
   - **Measure:** imports
   - **Evidence:** \`bun test src/core\`
`

function makePreFix017Dir(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'audit-fix-'))
  writeFileSync(path.join(dir, 'spec.md'), MINIMAL_SPEC)
  writeFileSync(path.join(dir, 'plan.md'), '# Plan\n\nSee spec.md.\n')
  writeFileSync(
    path.join(dir, 'tasks.md'),
    `# Tasks

## Phase A — logging
- [ ] **T1** Merge RPC plugins — *gate:* COH-1 AC1
- [ ] **T2** Fold renderer env — *gate:* COH-1 AC2

## Phase B — merges
- [ ] **T3** Cohesion inventory — *gate:* COH-2 AC1
`
  )
  return dir
}

describe('audit_fix_core', () => {
  it('plans fixes for missing handoff, task ids, and checklists', () => {
    const dir = makePreFix017Dir()
    try {
      const plan = planFixes(dir)
      const rules = plan.actions.map(a => a.rule)
      expect(rules).toContain('quartet.handoff')
      expect(rules).toContain('tasks.id')
      expect(rules.some(r => r.startsWith('phase.analyze'))).toBe(true)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('runConform scaffolds artifacts and clears audit errors', () => {
    const dir = makePreFix017Dir()
    try {
      expect(runAudit(dir).summary.errors).toBeGreaterThan(0)
      const { after } = runConform(dir)
      expect(existsSync(path.join(dir, 'handoff.md'))).toBe(true)
      expect(existsSync(path.join(dir, 'checklists', 'analyze-plan.md'))).toBe(true)
      expect(existsSync(path.join(dir, 'checklists', 'analyze-tasks.md'))).toBe(true)
      const tasks = Bun.file(path.join(dir, 'tasks.md'))
      expect(tasks.size).toBeGreaterThan(0)
      expect(after.summary.errors).toBe(0)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('renumbers task IDs to T101+ without T001 leak', () => {
    const dir = makePreFix017Dir()
    try {
      const plan = planFixes(dir)
      applyFixes(dir, plan)
      const tasks = readFileSync(path.join(dir, 'tasks.md'), 'utf8')
      expect(tasks).toContain('**T101**')
      expect(tasks).not.toMatch(NO_T001)
      expect(tasks).not.toContain('**T1**')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('does not plan handoff fix when AC rows already exist', () => {
    const dir = makePreFix017Dir()
    writeFileSync(
      path.join(dir, 'handoff.md'),
      `# Handoff

| ID | Done when | Evidence |
| --- | --- | --- |
| COH-1 AC1 | done | \`bun test\` |
`
    )
    try {
      expect(planFixes(dir).actions.some(a => a.rule === 'quartet.handoff')).toBe(false)
      expect(planFixes(dir, { force: true }).actions.some(a => a.rule === 'quartet.handoff')).toBe(true)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('tasks.sample-leak backtick exemption', () => {
  it('does not flag T001 inside backticks', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'audit-leak-'))
    writeFileSync(path.join(dir, 'spec.md'), '# x\n')
    writeFileSync(path.join(dir, 'plan.md'), '# p\n')
    writeFileSync(
      path.join(dir, 'handoff.md'),
      '# h\n\n| ID | Done when | Evidence |\n| -- | -- | -- |\n| COH-1 AC1 | x | `bun test` |\n'
    )
    writeFileSync(path.join(dir, 'tasks.md'), '# Tasks\n\n## Phase 1\n\n- [ ] **T101** Renumber from `T001` template\n')
    mkdirSync(path.join(dir, 'checklists'))
    writeFileSync(path.join(dir, 'checklists/analyze-plan.md'), 'ok')
    writeFileSync(path.join(dir, 'checklists/analyze-tasks.md'), 'ok')
    try {
      const leak = runAudit(dir).findings.find(f => f.rule === 'tasks.sample-leak')
      expect(leak).toBeUndefined()
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
