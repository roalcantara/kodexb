import type { RpcKnowledge } from '@shared/rpc'
import { fireAndForget } from '@shared/utils'
import { useCallback } from 'react'
import { deleteTask, reorderTask } from '../../rpc/client'
import type { ListPageShellFoundation } from './use_list_page_shell_foundation.hook'
import { useTaskDragDrop } from './use_task_drag_drop.hook'
import { useTaskKeyboard } from './use_task_keyboard.hook'

export function useListPageShellTaskInteractions(foundation: ListPageShellFoundation) {
  const { data, taskSheet, mutation, sel } = foundation

  const handleRequestDelete = useCallback(
    (entry: RpcKnowledge) => {
      fireAndForget(deleteTask(entry.id).then(() => data.refreshList(false)))
    },
    [data.refreshList]
  )

  useTaskKeyboard({
    selectedId: sel.selectedId,
    rows: data.rows,
    onRefresh: () => fireAndForget(data.refreshList(false)),
    onNewTask: taskSheet.handleNewTask,
    onRequestDelete: handleRequestDelete,
    onMutationError: mutation.setMutationError
  })

  return useTaskDragDrop(data.rows, id => {
    fireAndForget(reorderTask(id.entryId, id.dir).then(() => data.refreshList(false)))
  })
}
