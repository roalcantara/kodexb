import type { RpcKnowledge, TaskCreateInput, TaskMutationOutcome, TaskUpdateInput } from '@shared/rpc'
import { call, rpc } from './client'

export function createTask(input: TaskCreateInput): Promise<TaskMutationOutcome<RpcKnowledge>> {
  return call<TaskMutationOutcome<RpcKnowledge>>(rpc.api.createTask.post(input))
}

export function updateTask(
  id: number,
  patch: TaskUpdateInput,
  sourceVersion?: number
): Promise<TaskMutationOutcome<RpcKnowledge>> {
  return call<TaskMutationOutcome<RpcKnowledge>>(rpc.api.updateTask.post({ id, patch, sourceVersion }))
}

export function deleteTask(id: number, sourceVersion?: number): Promise<TaskMutationOutcome<void>> {
  return call<TaskMutationOutcome<void>>(rpc.api.deleteTask.post({ id, sourceVersion }))
}

export function cycleStatus(
  id: number,
  dir: 'forward' | 'backward',
  sourceVersion?: number
): Promise<TaskMutationOutcome<RpcKnowledge>> {
  return call<TaskMutationOutcome<RpcKnowledge>>(rpc.api.cycleStatus.post({ id, dir, sourceVersion }))
}

export function cyclePriority(
  id: number,
  dir: 'forward' | 'backward',
  sourceVersion?: number
): Promise<TaskMutationOutcome<RpcKnowledge>> {
  return call<TaskMutationOutcome<RpcKnowledge>>(rpc.api.cyclePriority.post({ id, dir, sourceVersion }))
}

export function reorderTask(
  id: number,
  dir: 'up' | 'down',
  sourceVersion?: number
): Promise<TaskMutationOutcome<RpcKnowledge[]>> {
  return call<TaskMutationOutcome<RpcKnowledge[]>>(rpc.api.reorderTask.post({ id, dir, sourceVersion }))
}
