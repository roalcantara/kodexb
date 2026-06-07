import { describe, expect, it } from 'bun:test'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { run } from './orchestrated_handoff.script.ts'
import { generateRunId, WorkflowRunWriter } from './workflow_run.script.ts'
import { expectEventBasics } from './workflow_test_helpers.script.ts'

describe('manifest_emitted (--manifest branch)', () => {
  it('emits manifest_emitted event with subtask_types and subtask_count', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'oh-manifest-'))
    const runsDir = mkdtempSync(path.join(tmpdir(), 'oh-manifest-r-'))
    writeFileSync(
      path.join(root, 'handoff.md'),
      '| ID | Done when | Evidence |\n| --- | --------- | -------- |\n| SF-1 AC1 | works | `bun test x` |\n| SF-2 AC1 | smoke | Operator smoke below — pending human run |'
    )
    const writer = new WorkflowRunWriter(generateRunId('test-manifest'), root, runsDir)
    const savedLog = console.log
    console.log = () => undefined
    run(['orchestrated-handoff', '--feature', root, '--manifest'], { writer })
    console.log = savedLog
    const event = JSON.parse(readFileSync(writer.currentPath as string, 'utf-8').trim())
    expectEventBasics(event, 'manifest_emitted', root)
    expect(Array.isArray(event.subtask_types)).toBe(true)
    expect(event.subtask_types.length).toBeGreaterThan(0)
    expect(event.subtask_count).toBe(event.subtask_types.length)
    expect(event.subtask_types).toContain('implement-src')
    rmSync(root, { recursive: true, force: true })
    rmSync(runsDir, { recursive: true, force: true })
  })

  it('stderr when handoff.md is missing', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'oh-manifest-no-'))
    const runsDir = mkdtempSync(path.join(tmpdir(), 'oh-manifest-no-r-'))
    const writer = new WorkflowRunWriter(generateRunId('test-manifest-no'), root, runsDir)
    const savedLog = console.log
    console.log = () => undefined
    const rc = run(['orchestrated-handoff', '--feature', root, '--manifest'], { writer })
    console.log = savedLog
    expect(rc).toBe(1)
    expect(writer.currentPath).toBeNull()
    rmSync(root, { recursive: true, force: true })
    rmSync(runsDir, { recursive: true, force: true })
  })
})
