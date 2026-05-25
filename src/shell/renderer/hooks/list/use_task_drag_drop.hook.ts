import type { RpcKnowledge } from '@shared/rpc'
import type { DragEvent } from 'react'
import { useCallback, useRef, useState } from 'react'

export type DragDropReorderArgs = { entryId: number; dir: 'up' | 'down' }

export function useTaskDragDrop(rows: RpcKnowledge[], onReorder: (args: DragDropReorderArgs) => void) {
  const [dragOverId, setDragOverId] = useState<number | null>(null)
  const dragIdRef = useRef<number | null>(null)

  const getDragHandlers = useCallback(
    (entry: RpcKnowledge) => {
      if (entry.type !== 'task') return {}

      return {
        draggable: true as const,
        onDragStart: (e: DragEvent) => {
          e.dataTransfer.effectAllowed = 'move'
          e.dataTransfer.setData('text/plain', String(entry.id))
          dragIdRef.current = entry.id
          const el = e.currentTarget as HTMLElement
          requestAnimationFrame(() => {
            el.classList.add('theme-entry-row--dragging')
          })
        },
        onDragEnd: (e: DragEvent) => {
          dragIdRef.current = null
          setDragOverId(null)
          const el = e.currentTarget as HTMLElement
          el.classList.remove('theme-entry-row--dragging')
        },
        onDragOver: (e: DragEvent) => {
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
          setDragOverId(entry.id)
        },
        onDragLeave: () => {
          setDragOverId(prev => (prev === entry.id ? null : prev))
        },
        onDrop: (e: DragEvent) => {
          e.preventDefault()
          setDragOverId(null)
          const fromId = dragIdRef.current
          if (fromId == null || fromId === entry.id) return
          const fromIdx = rows.findIndex(r => r.id === fromId)
          const toIdx = rows.findIndex(r => r.id === entry.id)
          if (fromIdx < 0 || toIdx < 0) return
          onReorder({
            entryId: fromId,
            dir: fromIdx < toIdx ? 'down' : 'up'
          })
        }
      }
    },
    [rows, onReorder]
  )

  return { dragOverId, getDragHandlers }
}
