import type { RpcKnowledge } from '@shared/rpc'
import { fireAndForget } from '@shared/utils'
import { useCallback, useState } from 'react'

export type TaskSheetVisibility = {
  taskSheetEntry: RpcKnowledge | null
  taskSheetVisible: boolean
  handleNewTask: () => void
  handleEditTask: (entry: RpcKnowledge) => void
  onCloseTaskSheet: () => void
}

export function useTaskSheetVisibility(refreshList: (more: boolean) => void | Promise<void>): TaskSheetVisibility {
  const [taskSheetEntry, setTaskSheetEntry] = useState<RpcKnowledge | null>(null)
  const [taskSheetOpen, setTaskSheetOpen] = useState(false)

  const handleNewTask = useCallback(() => {
    setTaskSheetEntry(null)
    setTaskSheetOpen(true)
  }, [])

  const handleEditTask = useCallback((entry: RpcKnowledge) => {
    setTaskSheetEntry(entry)
    setTaskSheetOpen(true)
  }, [])

  const onCloseTaskSheet = useCallback(() => {
    setTaskSheetEntry(null)
    setTaskSheetOpen(false)
    fireAndForget(Promise.resolve(refreshList(false)))
  }, [refreshList])

  return {
    taskSheetEntry,
    taskSheetVisible: taskSheetOpen,
    handleNewTask,
    handleEditTask,
    onCloseTaskSheet
  }
}
