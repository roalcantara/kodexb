import type { Dispatch, KeyboardEvent as ReactKeyboardEvent, RefObject, SetStateAction } from 'react'
import { useCallback } from 'react'

import { focusSearchInputCaretAt, listSearchTypeaheadAction } from '../../utils/list/list_keyboard.util'

export type ListSurfaceKeydownDeps = {
  setSearch: Dispatch<SetStateAction<string>>
  onListKeyDown: (e: ReactKeyboardEvent<HTMLDivElement>) => void
  setSelectedId: (id: number | null) => void
  searchInputRef: RefObject<HTMLInputElement | null>
}

export function useListSurfaceKeyDown(deps: ListSurfaceKeydownDeps) {
  const { setSearch, onListKeyDown, setSelectedId, searchInputRef } = deps
  return useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      const action = listSearchTypeaheadAction(e)
      if (action.type === 'none') {
        onListKeyDown(e)
        return
      }
      e.preventDefault()
      setSelectedId(null)
      if (action.type === 'backspace') {
        setSearch(prev => {
          const next = prev.slice(0, -1)
          focusSearchInputCaretAt(searchInputRef, next.length)
          return next
        })
        return
      }
      setSearch(prev => {
        const next = prev + action.char
        focusSearchInputCaretAt(searchInputRef, next.length)
        return next
      })
    },
    [onListKeyDown, searchInputRef, setSearch, setSelectedId]
  )
}
