import type { RpcKnowledge, TaskCreateInput, TaskMutationOutcome, TaskUpdateInput } from '@shared/rpc'
import { rpc, unwrap } from './client'

export function createTask(input: TaskCreateInput): Promise<TaskMutationOutcome<RpcKnowledge>> {
  return rpc.api.createTask.post(input).then(unwrap) as Promise<TaskMutationOutcome<RpcKnowledge>>
}

export function updateTask(
  id: number,
  patch: TaskUpdateInput,
  sourceVersion?: number
): Promise<TaskMutationOutcome<RpcKnowledge>> {
  return rpc.api.updateTask.post({ id, patch, sourceVersion }).then(unwrap) as Promise<
    TaskMutationOutcome<RpcKnowledge>
  >
}

export function deleteTask(id: number, sourceVersion?: number): Promise<TaskMutationOutcome<void>> {
  return rpc.api.deleteTask.post({ id, sourceVersion }).then(unwrap) as Promise<TaskMutationOutcome<void>>
}

export function cycleStatus(
  id: number,
  dir: 'forward' | 'backward',
  sourceVersion?: number
): Promise<TaskMutationOutcome<RpcKnowledge>> {
  return rpc.api.cycleStatus.post({ id, dir, sourceVersion }).then(unwrap) as Promise<TaskMutationOutcome<RpcKnowledge>>
}

export function cyclePriority(
  id: number,
  dir: 'forward' | 'backward',
  sourceVersion?: number
): Promise<TaskMutationOutcome<RpcKnowledge>> {
  return rpc.api.cyclePriority.post({ id, dir, sourceVersion }).then(unwrap) as Promise<
    TaskMutationOutcome<RpcKnowledge>
  >
}

export function reorderTask(
  id: number,
  dir: 'up' | 'down',
  sourceVersion?: number
): Promise<TaskMutationOutcome<RpcKnowledge[]>> {
  return rpc.api.reorderTask.post({ id, dir, sourceVersion }).then(unwrap) as Promise<
    TaskMutationOutcome<RpcKnowledge[]>
  >
}
