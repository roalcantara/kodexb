import { describe, expect, it } from 'bun:test'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { auditFeatureDir } from './tasks_audit.ts'

const tmp = join(import.meta.dir, '.tmp-tasks-audit')

describe('auditFeatureDir', () => {
  it('flags missing handoff', async () => {
    const dir = join(tmp, '001-test')
    rmSync(dir, { recursive: true, force: true })
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'spec.md'), '## REQUIREMENT SF-1: x\n')
    writeFileSync(
      join(dir, 'tasks.md'),
      '- [ ] T001 Do thing\n- [ ] T002 Create harness in foo.spec.ts\n- [ ] T003 Integration test in foo.spec.ts\n'
    )
    const findings = await auditFeatureDir(dir)
    expect(findings.some(f => f.rule === 'handoff-missing')).toBe(true)
    rmSync(dir, { recursive: true, force: true })
  })

  it('flags integration test before harness', async () => {
    const dir = join(tmp, '002-test')
    rmSync(dir, { recursive: true, force: true })
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'spec.md'), '## REQUIREMENT SF-1: x\n')
    writeFileSync(join(dir, 'handoff.md'), '# Handoff\n')
    writeFileSync(
      join(dir, 'tasks.md'),
      '- [ ] T001 Integration test in foo.spec.ts\n- [ ] T002 Create harness in foo.spec.ts\n'
    )
    const findings = await auditFeatureDir(dir)
    expect(findings.some(f => f.rule === 'task-order-harness')).toBe(true)
    rmSync(dir, { recursive: true, force: true })
  })
})
