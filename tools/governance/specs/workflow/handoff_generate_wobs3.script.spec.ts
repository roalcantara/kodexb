import { describe, expect, it } from 'bun:test'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { dispatchToOpencode, run } from './handoff_generate.script.ts'
import { generateRunId, WorkflowRunWriter } from './workflow_run.script.ts'
import { assertHandoffFile, readHandoffEvents } from './workflow_test_helpers.script.ts'

describe('WOBS-3: event emission', () => {
  function fixture(root: string, table: string) {
    writeFileSync(path.join(root, 'handoff.md'), table)
  }

  it('AC1: run() emits handoff_written with path, focus, ac_row_count, has_e2e_block, duration_ms', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'hg-w3a-'))
    const runsDir = mkdtempSync(path.join(tmpdir(), 'hg-w3a-r-'))
    fixture(
      root,
      '| ID | Done when | Evidence |\n| --- | --------- | -------- |\n| SF-1 AC1 | works | bun test x |\n| SF-2 AC1 | smoke | Operator smoke below |'
    )
    const writer = new WorkflowRunWriter(generateRunId('test-w3a'), root, runsDir)
    const savedLog = console.log
    console.log = () => undefined
    run(['--feature', root], { writer })
    console.log = savedLog
    const event = JSON.parse(readFileSync(writer.currentPath as string, 'utf-8').trim())
    expect(event.type).toBe('handoff_written')
    expect(typeof event.path).toBe('string')
    expect(event.focus).toBe('gherkin')
    expect(event.ac_row_count).toBe(2)
    expect(event.has_e2e_block).toBe(true)
    expect(typeof event.duration_ms).toBe('number')
    rmSync(root, { recursive: true, force: true })
    rmSync(runsDir, { recursive: true, force: true })
  })

  it('AC2: --dry-run returns 0 and does NOT emit handoff_written', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'hg-w3b-'))
    const runsDir = mkdtempSync(path.join(tmpdir(), 'hg-w3b-r-'))
    fixture(root, '| ID | Done when | Evidence |\n| --- | --------- | -------- |\n| SF-1 AC1 | works | bun test x |')
    const writer = new WorkflowRunWriter(generateRunId('test-w3b'), root, runsDir)
    const savedLog = console.log
    console.log = () => undefined
    const rc = run(['--feature', root, '--dry-run'], { writer })
    console.log = savedLog
    expect(rc).toBe(0)
    expect(writer.currentPath).toBeNull()
    rmSync(root, { recursive: true, force: true })
    rmSync(runsDir, { recursive: true, force: true })
  })
})

describe('WOBS-4 AC2: run() with --dispatch emits dispatch_invoked event', () => {
  function fixture(root: string, table: string) {
    writeFileSync(path.join(root, 'handoff.md'), table)
  }

  it('run() with --dispatch emits dispatch_invoked with opencode_found=false when opencode not on PATH', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'hg-w4b-'))
    const runsDir = mkdtempSync(path.join(tmpdir(), 'hg-w4b-r-'))
    fixture(root, '| ID | Done when | Evidence |\n| --- | --------- | -------- |\n| SF-1 AC1 | works | bun test x |')
    const writer = new WorkflowRunWriter(generateRunId('test-w4b'), root, runsDir)
    process.env.ORCHESTRATED_HANDOFF_DISPATCH = '1'
    const savedLog = console.log
    console.log = () => undefined
    run(['--feature', root], { writer, which: () => null })
    console.log = savedLog
    process.env.ORCHESTRATED_HANDOFF_DISPATCH = ''
    const { handoffFilePath } = assertHandoffFile(root)
    const { lines } = readHandoffEvents(writer)
    const handoffWritten = JSON.parse(lines[0] as string)
    const dispatchInvoked = JSON.parse(lines[1] as string)
    expect(handoffWritten.type).toBe('handoff_written')
    expect(dispatchInvoked.type).toBe('dispatch_invoked')
    expect(dispatchInvoked.opencode_found).toBe(false)
    expect(typeof dispatchInvoked.exit_code).toBe('number')
    expect(typeof dispatchInvoked.body_bytes).toBe('number')
    rmSync(handoffFilePath, { force: true })
    rmSync(root, { recursive: true, force: true })
    rmSync(runsDir, { recursive: true, force: true })
  })

  it('--dispatch flag without ORCHESTRATED_HANDOFF_DISPATCH also triggers dispatch', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'hg-w4c-'))
    const runsDir = mkdtempSync(path.join(tmpdir(), 'hg-w4c-r-'))
    fixture(root, '| ID | Done when | Evidence |\n| --- | --------- | -------- |\n| SF-1 AC1 | works | bun test x |')
    const writer = new WorkflowRunWriter(generateRunId('test-w4c'), root, runsDir)
    const savedLog = console.log
    console.log = () => undefined
    run(['--feature', root, '--dispatch'], { writer, which: () => null })
    console.log = savedLog
    const { handoffFilePath } = assertHandoffFile(root)
    const { lines } = readHandoffEvents(writer)
    expect(lines.length).toBe(2)
    expect(JSON.parse(lines[1] as string).type).toBe('dispatch_invoked')
    expect(JSON.parse(lines[1] as string).opencode_found).toBe(false)
    rmSync(handoffFilePath, { force: true })
    rmSync(root, { recursive: true, force: true })
    rmSync(runsDir, { recursive: true, force: true })
  })
})

describe('WOBS-4 AC2: dispatchToOpencode with which=null writes dispatch_invoked event', () => {
  it('emits dispatch_invoked with opencode_found=false, dispatched=false, exitCode 0', () => {
    const runsDir = mkdtempSync(path.join(tmpdir(), 'hg-w4a-'))
    const writer = new WorkflowRunWriter(generateRunId('test-w4a'), '/tmp/x', runsDir)
    const r = dispatchToOpencode('body', '/tmp/x.md', {
      which: () => null,
      writer,
      featureDir: '/tmp/x',
      log: () => undefined
    })
    expect(r.dispatched).toBe(false)
    expect(r.exitCode).toBe(0)
    const event = JSON.parse(readFileSync(writer.currentPath as string, 'utf-8').trim())
    expect(event.type).toBe('dispatch_invoked')
    expect(event.opencode_found).toBe(false)
    expect(event.exit_code).toBe(0)
    expect(typeof event.body_bytes).toBe('number')
    rmSync(runsDir, { recursive: true, force: true })
  })
})
