import fs from 'node:fs/promises'
import type { Knowledge } from '../../../core'

type AppLog = ReturnType<typeof import('../../../shared/logging').createLogger>

export async function writeTaskToSource(log: AppLog, filePath: string, task: Knowledge): Promise<void> {
  try {
    let doc: Record<string, unknown> = {}
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      doc = Bun.YAML.parse(content) as Record<string, unknown>
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e
    }
    const tasks = (doc.tasks ?? {}) as Record<string, unknown>
    tasks[task.key] = taskToSourceRecord(task)
    doc.tasks = tasks
    const tmpPath = `${filePath}.tmp`
    await fs.writeFile(tmpPath, Bun.YAML.stringify(doc), 'utf-8')
    await fs.rename(tmpPath, filePath)
  } catch (err) {
    log.error(['Source write-back failed', task.key, filePath, err])
  }
}

export async function removeTaskFromSource(log: AppLog, key: string, filePath: string): Promise<void> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const doc = Bun.YAML.parse(content) as Record<string, unknown>
    const tasks = (doc.tasks ?? {}) as Record<string, unknown>
    delete tasks[key]
    if (Object.keys(tasks).length === 0) {
      await fs.unlink(filePath)
    } else {
      doc.tasks = tasks
      const tmpPath = `${filePath}.tmp`
      await fs.writeFile(tmpPath, Bun.YAML.stringify(doc), 'utf-8')
      await fs.rename(tmpPath, filePath)
    }
  } catch (err) {
    log.error(['Source remove failed', key, filePath, err])
  }
}

export function taskToSourceRecord(task: Knowledge): Record<string, unknown> {
  const shape: Record<string, unknown> = {}
  if (task.desc) shape.desc = task.desc
  if (task.tags && task.tags.length > 0) shape.tags = task.tags
  if (task.type === 'task') {
    shape.status = task.status
    if (task.priority) shape.priority = task.priority
    if (task.dueDate) shape.due = new Date(task.dueDate).toISOString().split('T')[0]
    if (task.taskOrder != null) shape.task_order = task.taskOrder
    if (task.dependsOn && task.dependsOn.length > 0) shape.depends_on = task.dependsOn.map(String)
  }
  return shape
}
