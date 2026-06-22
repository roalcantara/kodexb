import type { Knowledge } from '@core'
import type { TaskCreateInput, TaskUpdateInput } from '@shared/rpc'
import type { LifecycleService } from './lifecycle.service'
import {
  createTask as createTaskMutation,
  cyclePriority as cyclePriorityMutation,
  cycleStatus as cycleStatusMutation,
  deleteTask as deleteTaskMutation,
  reorderTask as reorderTaskMutation,
  updateTask as updateTaskMutation
} from '../lib/task/mutation.service'
import type { TaskMutationLogContext } from '../lib/task/source.service'
import type { QueryService } from './query.service'
import type { LoadedConfig } from '../config/config.loader'

export class TaskMutationService {
  constructor(
    private readonly lifecycle: LifecycleService,
    private readonly query: QueryService,
    private readonly loaded: LoadedConfig
  ) {}

  private appLike() {
    return {
      getLog: () => this.lifecycle.log,
      getLoadedConfig: () => this.loaded,
      getEntry: (id: number) => this.query.getEntry(id),
      getDbForTaskMutation: () => this.lifecycle.getDbForTaskMutation(),
      invalidateListCache: () => this.lifecycle.invalidateListCache(),
      taskProjectionWriteError: (
        operation: 'create' | 'update' | 'delete' | 'reorder',
        taskKey: string,
        cause: unknown
      ) => this.lifecycle.taskProjectionWriteError(operation, taskKey, cause)
    }
  }

  async createTask(input: TaskCreateInput, context?: TaskMutationLogContext): Promise<Knowledge> {
    return await createTaskMutation(this.appLike(), input, context)
  }

  async updateTask(id: number, patch: TaskUpdateInput, context?: TaskMutationLogContext): Promise<Knowledge> {
    return await updateTaskMutation(this.appLike(), id, patch, context)
  }

  async deleteTask(id: number, context?: TaskMutationLogContext): Promise<void> {
    return await deleteTaskMutation(this.appLike(), id, context)
  }

  async cycleStatus(id: number, dir: 'forward' | 'backward', context?: TaskMutationLogContext): Promise<Knowledge> {
    return await cycleStatusMutation(this.appLike(), id, dir, context)
  }

  async cyclePriority(id: number, dir: 'forward' | 'backward', context?: TaskMutationLogContext): Promise<Knowledge> {
    return await cyclePriorityMutation(this.appLike(), id, dir, context)
  }

  async reorderTask(id: number, dir: 'up' | 'down', context?: TaskMutationLogContext): Promise<Knowledge[]> {
    return await reorderTaskMutation(this.appLike(), id, dir, context)
  }
}
