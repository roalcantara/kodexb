export type TaskMutationOperation = 'create' | 'update' | 'delete' | 'reorder' | 'cycle_status' | 'cycle_priority'

export type TaskMutationStatus = 'success' | 'source_write_failed' | 'conflict' | 'projection_failed'

export type TaskMutationFailureStatus = Exclude<TaskMutationStatus, 'success'>

export type TaskMutationFailureDetails = {
  correlationId?: string
  currentSourceVersion?: number
  requestSourceVersion?: number
}

export type TaskMutationSuccessOutcome<Titem> = {
  ok: true
  status: 'success'
  operation: TaskMutationOperation
  taskId?: number
  sourceVersion?: number
  message: string
  data: Titem
}

export type TaskMutationFailureOutcome = {
  ok: false
  status: TaskMutationFailureStatus
  operation: TaskMutationOperation
  taskId?: number
  sourceVersion?: number
  message: string
  details?: TaskMutationFailureDetails
}

export type TaskMutationOutcome<Titem> = TaskMutationSuccessOutcome<Titem> | TaskMutationFailureOutcome
