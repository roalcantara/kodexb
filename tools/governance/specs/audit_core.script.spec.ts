import { describe, expect, it } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { runAudit } from './audit_core.script.ts'

function makeFeatureDir(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'audit-core-test-'))
  mkdirSync(path.join(dir, 'checklists'), { recursive: true })
  return dir
}

function cleanup(dir: string) {
  rmSync(dir, { recursive: true, force: true })
}

function writeQuartet(dir: string) {
  for (const n of ['spec.md', 'plan.md', 'tasks.md', 'handoff.md']) {
    writeFileSync(
      path.join(dir, n),
      n === 'handoff.md' ? defaultHandoffMd : n === 'tasks.md' ? defaultTasksMd : '# test'
    )
  }
  for (const c of ['analyze-plan.md', 'analyze-tasks.md']) {
    writeFileSync(path.join(dir, 'checklists', c), 'done')
  }
}

const defaultHandoffMd = `# Handoff test

| ID | Done when | Evidence |
| -- | --------- | -------- |
| WOBS-1 AC1 | Feature works | \`bun test .../spec\` |
`

const defaultTasksMd = `# Tasks test

## Phase 1 — Setup

| # | Task | Done when | Refs |
| - | ---- | --------- | ---- |
| 1 | Add feature | done | WOBS-1 |

- [ ] Implement feature
- [ ] Test feature
`

describe('audit_core', () => {
  it('clean feature dir passes with 0 errors', () => {
    const dir = makeFeatureDir()
    writeQuartet(dir)
    try {
      const result = runAudit(dir)
      expect(result.summary.errors).toBe(0)
      expect(result.summary.total).toBeGreaterThan(0)
    } finally {
      cleanup(dir)
    }
  })

  it('missing handoff.md reports quartet.handoff error', () => {
    const dir = makeFeatureDir()
    writeQuartet(dir)
    rmSync(path.join(dir, 'handoff.md'))
    try {
      const result = runAudit(dir)
      const handoffError = result.findings.find(f => f.rule === 'quartet.handoff')
      expect(handoffError).toBeDefined()
      expect(handoffError?.level).toBe('error')
    } finally {
      cleanup(dir)
    }
  })

  it('handoff table with empty Evidence reports handoff.evidence error', () => {
    const dir = makeFeatureDir()
    writeQuartet(dir)
    writeFileSync(
      path.join(dir, 'handoff.md'),
      `| ID | Done when | Evidence |
| -- | --------- | -------- |
| WOBS-1 AC1 | Feature works | |
`
    )
    try {
      const result = runAudit(dir)
      const evErr = result.findings.find(f => f.rule === 'handoff.evidence')
      expect(evErr).toBeDefined()
      expect(evErr?.level).toBe('error')
    } finally {
      cleanup(dir)
    }
  })

  it('tasks.md with sample template leak reports tasks.sample-leak error', () => {
    const dir = makeFeatureDir()
    writeQuartet(dir)
    writeFileSync(path.join(dir, 'tasks.md'), 'T001 — illustration purposes only')
    try {
      const result = runAudit(dir)
      const leak = result.findings.find(f => f.rule === 'tasks.sample-leak')
      expect(leak).toBeDefined()
      expect(leak?.level).toBe('error')
    } finally {
      cleanup(dir)
    }
  })

  it('returns phase info in result', () => {
    const dir = makeFeatureDir()
    writeQuartet(dir)
    try {
      const result = runAudit(dir)
      expect(result.phase.name).toBeTruthy()
      expect(result.featureDir).toBe(dir)
    } finally {
      cleanup(dir)
    }
  })

  it('missing spec.md reports quartet.spec error', () => {
    const dir = makeFeatureDir()
    writeQuartet(dir)
    rmSync(path.join(dir, 'spec.md'))
    try {
      const result = runAudit(dir)
      const specErr = result.findings.find(f => f.rule === 'quartet.spec')
      expect(specErr).toBeDefined()
      expect(specErr?.level).toBe('error')
    } finally {
      cleanup(dir)
    }
  })

  it('handoff table rows missing Done when and Evidence both flagged', () => {
    const dir = makeFeatureDir()
    writeQuartet(dir)
    writeFileSync(
      path.join(dir, 'handoff.md'),
      `| ID | Done when | Evidence |
| -- | --------- | -------- |
| WOBS-1 AC1 |  | |
`
    )
    try {
      const result = runAudit(dir)
      const doneWhen = result.findings.find(f => f.rule === 'handoff.done-when')
      const evidence = result.findings.find(f => f.rule === 'handoff.evidence')
      expect(doneWhen).toBeDefined()
      expect(evidence).toBeDefined()
    } finally {
      cleanup(dir)
    }
  })

  it('pre-analyze dir returns info-level analyze-tasks-ready', () => {
    const dir = makeFeatureDir()
    writeQuartet(dir)
    rmSync(path.join(dir, 'checklists', 'analyze-tasks.md'))
    try {
      const result = runAudit(dir)
      const ready = result.findings.find(f => f.rule === 'phase.analyze-tasks-ready')
      expect(ready).toBeDefined()
      expect(ready?.level).toBe('info')
      expect(result.summary.errors).toBe(0)
    } finally {
      cleanup(dir)
    }
  })
})
