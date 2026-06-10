import { describe, expect, it } from 'bun:test'
import { spawnTeardownFireAndForget } from './teardown_runner.script.ts'
import { generateRunId, WorkflowRunWriter } from './workflow_run.script.ts'

describe('spawnTeardownFireAndForget', () => {
  it('returns TeardownHandle with abort', async () => {
    const writer = new WorkflowRunWriter(generateRunId('test'), '__fixtures__')
    let settled = false
    const handle = spawnTeardownFireAndForget(
      { command: 'echo ok' },
      ['echo', 'bun'],
      { writer, featureDir: '__fixtures__' },
      'specify',
      5000,
      () => {
        settled = true
      }
    )
    expect(typeof handle.command).toBe('string')
    expect(typeof handle.abort).toBe('function')
    await new Promise(r => setTimeout(r, 200))
    expect(settled).toBe(true)
  })

  it('abort kills child and produces cancelled task.completed', async () => {
    const writer = new WorkflowRunWriter(generateRunId('test'), '__fixtures__')
    let settledStatus = ''
    const handle = spawnTeardownFireAndForget(
      { command: 'sleep 10' },
      ['sleep', 'echo'],
      { writer, featureDir: '__fixtures__' },
      'specify',
      5000,
      r => {
        settledStatus = r.rejected ? 'cancelled' : 'ok'
      }
    )
    handle.abort()
    await new Promise(r => setTimeout(r, 500))
    expect(settledStatus).toBe('cancelled')
  })
})
