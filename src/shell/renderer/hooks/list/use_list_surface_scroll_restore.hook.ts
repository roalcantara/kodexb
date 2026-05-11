import type { RpcKnowledge } from '@shared/rpc'
import { type RefObject, useEffect, useRef } from 'react'

/**
 * When the detail panel opens, capture list surface scrollTop once; restore it after detail closes.
 */
export function useListSurfaceScrollRestore(
  listSurfaceRef: RefObject<HTMLDivElement | null>,
  detailEntry: RpcKnowledge | null
): void {
  const savedListScrollTop = useRef(0)
  const hadOpenDetail = useRef(false)

  useEffect(() => {
    const root = listSurfaceRef.current
    if (root === null) return
    if (detailEntry !== null) {
      if (!hadOpenDetail.current) {
        savedListScrollTop.current = root.scrollTop
        hadOpenDetail.current = true
      }
      return
    }
    if (!hadOpenDetail.current) return
    hadOpenDetail.current = false
    const y = savedListScrollTop.current
    requestAnimationFrame(() => {
      const surface = listSurfaceRef.current
      if (surface !== null) surface.scrollTop = y
    })
  }, [listSurfaceRef, detailEntry])
}
