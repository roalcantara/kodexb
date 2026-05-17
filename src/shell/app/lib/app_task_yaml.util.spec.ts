import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import fs, { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Knowledge } from '../../../core'
import { removeTaskFromYaml, taskToYamlShape, writeTaskToYaml } from './app_task_yaml.util'

let tmpDir = ''
let yamlPath = ''

function stubLog() {
  return { error: () => undefined } as unknown as ReturnType<typeof import('../../../shared/logging').createLogger>
}

function makeTask(overrides: Partial<Knowledge> = {}): Knowledge {
  return {
    type: 'task',
    id: 1,
    key: 'Build kb',
    desc: 'Build the knowledge base app',
    source: '/tmp/test.yaml',
    doc: '',
    tags: ['dev'],
    priority: 'high',
    status: 'doing',
    taskOrder: 1,
    dueDate: 1_700_000_000_000,
    dependsOn: [2, 3],
    createdAt: 0,
    updatedAt: 0,
    ...overrides
  } as Knowledge
}

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'kb-test-'))
  yamlPath = join(tmpDir, 'test.yaml')
})

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true })
})

describe('taskToYamlShape', () => {
  it('includes desc when present', () => {
    const shape = taskToYamlShape(makeTask({ desc: 'A description' }))
    expect(shape.desc).toBe('A description')
  })

  it('includes tags when non-empty', () => {
    const shape = taskToYamlShape(makeTask({ tags: ['dev'] }))
    expect(shape.tags).toEqual(['dev'])
  })

  it('includes task-specific fields', () => {
    const shape = taskToYamlShape(makeTask())
    expect(shape.status).toBe('doing')
    expect(shape.priority).toBe('high')
    expect(shape.task_order).toBe(1)
    expect(shape.due).toBe('2023-11-14')
    expect(shape.depends_on).toEqual(['2', '3'])
  })

  it('omits optional task fields when absent', () => {
    const shape = taskToYamlShape(makeTask({ priority: undefined, dueDate: undefined, dependsOn: [] }))
    expect(shape).not.toHaveProperty('priority')
    expect(shape).not.toHaveProperty('due')
    expect(shape).not.toHaveProperty('depends_on')
  })

  it('omits empty tags', () => {
    const shape = taskToYamlShape(makeTask({ tags: [] }))
    expect(shape).not.toHaveProperty('tags')
  })
})

describe('writeTaskToYaml', () => {
  it('creates a new YAML file with task', async () => {
    await writeTaskToYaml(stubLog(), yamlPath, makeTask())
    const content = await fs.readFile(yamlPath, 'utf-8')
    const parsed = Bun.YAML.parse(content) as Record<string, unknown>
    expect(parsed.tasks).toHaveProperty('Build kb')
  })

  it('appends to existing YAML file', async () => {
    await fs.writeFile(yamlPath, 'tasks:\n  existing: { desc: old }\n', 'utf-8')
    await writeTaskToYaml(stubLog(), yamlPath, makeTask({ key: 'New task' }))
    const content = await fs.readFile(yamlPath, 'utf-8')
    const parsed = Bun.YAML.parse(content) as Record<string, unknown>
    const tasks = parsed.tasks as Record<string, unknown>
    expect(tasks).toHaveProperty('existing')
    expect(tasks).toHaveProperty('New task')
  })
})

describe('removeTaskFromYaml', () => {
  it('removes a task from YAML file', async () => {
    await writeTaskToYaml(stubLog(), yamlPath, makeTask({ key: 'Keep me' }))
    await writeTaskToYaml(stubLog(), yamlPath, makeTask({ key: 'Remove me' }))
    await removeTaskFromYaml(stubLog(), 'Remove me', yamlPath)
    const content = await fs.readFile(yamlPath, 'utf-8')
    const parsed = Bun.YAML.parse(content) as Record<string, unknown>
    const tasks = parsed.tasks as Record<string, unknown>
    expect(tasks).toHaveProperty('Keep me')
    expect(tasks).not.toHaveProperty('Remove me')
  })

  it('deletes file when last task is removed', async () => {
    await writeTaskToYaml(stubLog(), yamlPath, makeTask())
    await removeTaskFromYaml(stubLog(), 'Build kb', yamlPath)
    await expect(fs.access(yamlPath)).rejects.toThrow()
  })
})
