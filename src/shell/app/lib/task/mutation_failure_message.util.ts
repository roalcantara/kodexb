import type { TaskMutationFailureStatus, TaskMutationOperation } from '@shared/rpc'

type BuildTaskMutationFailureMessageParams = {
  operation: TaskMutationOperation
  status: TaskMutationFailureStatus
  taskId?: number
  requestSourceVersion?: number
  currentSourceVersion?: number
}

const OPERATION_LABELS: Record<TaskMutationOperation, string> = {
  create: 'create',
  update: 'update',
  delete: 'delete',
  reorder: 'reorder',
  cycle_status: 'cycle status',
  cycle_priority: 'cycle priority'
}

function operationLabel(operation: TaskMutationOperation): string {
  return OPERATION_LABELS[operation]
}

export function buildTaskMutationFailureMessage(params: BuildTaskMutationFailureMessageParams): string {
  const base = `Task ${operationLabel(params.operation)}`
  const taskTarget = params.taskId === undefined ? '' : ` for id=${params.taskId}`

  if (params.status === 'source_write_failed') {
    return `${base}${taskTarget} failed: source write did not persist.`
  }
  if (params.status === 'projection_failed') {
    return `${base}${taskTarget} partially failed: source persisted, projection update failed.`
  }
  return `${base}${taskTarget} rejected: stale source version ${params.requestSourceVersion ?? 'unknown'} (current ${
    params.currentSourceVersion ?? 'unknown'
  }).`
}
