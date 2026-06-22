import { describe, expect, it, mock } from 'bun:test'
import { act, renderHook } from '@testing-library/react'
import { useTaskSheetVisibility } from './use_task_sheet_visibility.hook'

describe('useTaskSheetVisibility', () => {
  it('opens blank sheet for new task and closes with refresh', () => {
    const refreshList = mock(() => undefined)
    const { result } = renderHook(() => useTaskSheetVisibility(refreshList))

    act(() => result.current.handleNewTask())
    expect(result.current.taskSheetVisible).toBe(true)
    expect(result.current.taskSheetEntry).toBeNull()

    act(() => result.current.onCloseTaskSheet())
    expect(result.current.taskSheetVisible).toBe(false)
    expect(refreshList).toHaveBeenCalledWith(false)
  })
})
