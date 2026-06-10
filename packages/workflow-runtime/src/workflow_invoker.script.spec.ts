import { afterEach, describe, expect, it } from 'bun:test'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { invokeWithTelemetry } from './workflow_invoker.script.ts'
import { generateRunId, WorkflowRunWriter } from './workflow_run.script.ts'

const ALLOWED = ['echo']
let tmpRoot: string | null = null

afterEach(() => {
  if (tmpRoot && existsSync(tmpRoot)) rmSync(tmpRoot, { recursive: true, force: true })
  tmpRoot = null
})

describe('invokeWithTelemetry', () => {
  it('emits task.invoked and task.completed via writer', () => {
    tmpRoot = mkdtempSync(path.join(tmpdir(), 'telemetry-'))
    const writer = new WorkflowRunWriter(generateRunId('test'), '/tmp/test', tmpRoot)
    const result = invokeWithTelemetry({ command: 'echo hello' }, ALLOWED, 'evidence', 'specify', {
      writer,
      featureDir: '/tmp/test'
    })
    expect(result.exitCode).toBe(0)
    const ndjsonPath = writer.currentPath
    expect(ndjsonPath).not.toBeNull()
    const rawLines = readFileSync(ndjsonPath as string, 'utf-8')
      .trim()
      .split('\n')
    expect(rawLines).toHaveLength(2)
    const parsed = rawLines.map(l => JSON.parse(l))
    expect(parsed[0]).toMatchObject({ type: 'task.invoked', run_id: expect.any(String), role: 'evidence' })
    expect(parsed[1]).toMatchObject({ type: 'task.completed', run_id: expect.any(String), role: 'evidence' })
  })
})
