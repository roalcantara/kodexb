import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import fs, { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { factoryFor } from '@testing'
import type { Knowledge } from '../../../../core'
import {
  isTaskSourceWriteError,
  removeTaskFromSource,
  taskToSourceRecord,
  writeTaskToSource
} from './source.service'

let tmpDir = ''
let sourcePath = ''

function stubLog() {
  return { error: () => undefined } as unknown as ReturnType<typeof import('../../../../shared/logging').getLogger>
}

function captureLog(records: Array<{ message: string; fields: Record<string, unknown> }>) {
  return {
    error: (message: string, fields: Record<string, unknown>) => {
      records.push({ message, fields })
    }
  } as unknown as ReturnType<typeof import('../../../../shared/logging').getLogger>
}

const sampleTask = (overrides: Record<string, unknown> = {}): Knowledge =>
  factoryFor('task', {
    overrides: {
      id: 1,
      key: 'Build app',
      desc: 'Build the knowledge base app',
      source: '/tmp/test.yaml',
      doc: '',
      tags: ['dev'],
      priority: 'high',
      status: 'doing',
      taskOrder: 1,
      dueDate: 1_700_000_000_000,
      dependsOn: [2, 3],
      ...overrides
    }
  }) as Knowledge

async function tasksFromSource(path: string): Promise<Record<string, unknown>> {
  const content = await fs.readFile(path, 'utf-8')
  const parsed = Bun.YAML.parse(content) as Record<string, unknown>
  return parsed.tasks as Record<string, unknown>
}

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'kb-test-'))
  sourcePath = join(tmpDir, 'test.yaml')
})

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true })
})

describe('taskToSourceRecord', () => {
  it('includes desc', () => {
    const shape = taskToSourceRecord(sampleTask({ desc: 'A description' }))
    expect(shape.desc).toBe('A description')
  })

  it('includes tags', () => {
    const shape = taskToSourceRecord(sampleTask({ tags: ['dev'] }))
    expect(shape.tags).toEqual(['dev'])
  })

  it('includes task-specific fields', () => {
    const shape = taskToSourceRecord(sampleTask())
    expect(shape.status).toBe('doing')
    expect(shape.priority).toBe('high')
    expect(shape.task_order).toBe(1)
    expect(shape.due).toBe('2023-11-14')
    expect(shape.depends_on).toEqual(['2', '3'])
  })

  it('omits optional task fields when absent', () => {
    const shape = taskToSourceRecord(sampleTask({ priority: undefined, dueDate: undefined, dependsOn: [] }))
    expect(shape).not.toHaveProperty('priority')
    expect(shape).not.toHaveProperty('due')
    expect(shape).not.toHaveProperty('depends_on')
  })

  it('omits empty tags', () => {
    const shape = taskToSourceRecord(sampleTask({ tags: [] }))
    expect(shape).not.toHaveProperty('tags')
  })
})

describe('writeTaskToSource', () => {
  it('creates a new source file with task', async () => {
    await writeTaskToSource(stubLog(), sourcePath, sampleTask())
    const content = await fs.readFile(sourcePath, 'utf-8')
    const parsed = Bun.YAML.parse(content) as Record<string, unknown>
    expect(parsed.tasks).toHaveProperty('Build app')
  })

  it('appends to existing source file', async () => {
    await fs.writeFile(sourcePath, 'tasks:\n  existing: { desc: old }\n', 'utf-8')
    await writeTaskToSource(stubLog(), sourcePath, sampleTask({ key: 'New task' }))
    const tasks = await tasksFromSource(sourcePath)
    expect(tasks).toHaveProperty('existing')
    expect(tasks).toHaveProperty('New task')
  })

  it('throws TaskSourceWriteError when source cannot be written', async () => {
    try {
      await writeTaskToSource(stubLog(), '/dev/null/tasks.yml', sampleTask())
      expect.unreachable('Expected source write to fail')
    } catch (error) {
      expect(isTaskSourceWriteError(error)).toBe(true)
    }
  })

  it('emits one structured failure log on source write error', async () => {
    const records: Array<{ message: string; fields: Record<string, unknown> }> = []
    const log = captureLog(records)

    try {
      await writeTaskToSource(log, '/dev/null/tasks.yml', sampleTask({ key: 'log-probe-task' }), {
        operation: 'create',
        correlationId: 'corr-log-probe'
      })
      expect.unreachable('Expected source write to fail')
    } catch {
      expect(records).toHaveLength(1)
      const record = records[0] as { message: string; fields: Record<string, unknown> }
      expect(record.message).toContain('Source write-back failed')
      expect(record.fields.key).toBe('log-probe-task')
      expect(record.fields.path).toBe('/dev/null/tasks.yml')
      expect(record.fields.operation).toBe('create')
      expect(record.fields.correlationId).toBe('corr-log-probe')
      expect(typeof record.fields.error).toBe('string')
    }
  })
})

describe('removeTaskFromSource', () => {
  it('removes a task from source file', async () => {
    await writeTaskToSource(stubLog(), sourcePath, sampleTask({ key: 'Keep me' }))
    await writeTaskToSource(stubLog(), sourcePath, sampleTask({ key: 'Remove me' }))
    await removeTaskFromSource(stubLog(), 'Remove me', sourcePath)
    const tasks = await tasksFromSource(sourcePath)
    expect(tasks).toHaveProperty('Keep me')
    expect(tasks).not.toHaveProperty('Remove me')
  })

  it('deletes file when last task is removed', async () => {
    await writeTaskToSource(stubLog(), sourcePath, sampleTask())
    await removeTaskFromSource(stubLog(), 'Build app', sourcePath)
    await expect(fs.access(sourcePath)).rejects.toThrow()
  })

  it('throws TaskSourceWriteError when source cannot be modified', async () => {
    try {
      await removeTaskFromSource(stubLog(), 'ghost-task', '/dev/null/tasks.yml')
      expect.unreachable('Expected source remove to fail')
    } catch (error) {
      expect(isTaskSourceWriteError(error)).toBe(true)
    }
  })
})
