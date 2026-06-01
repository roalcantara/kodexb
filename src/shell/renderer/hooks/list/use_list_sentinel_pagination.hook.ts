import { fireAndForget } from '@shared/utils'
import { type RefObject, useEffect, useRef } from 'react'

export type ListSentinelPaginationArgs = {
  scrollRootRef: RefObject<HTMLElement | null>
  sentinelRef: RefObject<HTMLElement | null>
  hasMore: boolean
  loading: boolean
  fetchMore: () => Promise<void>
}

/** Load next page when the user scrolls the list surface near the bottom. */
export function useListSentinelPagination({
  scrollRootRef,
  sentinelRef,
  hasMore,
  loading,
  fetchMore
}: ListSentinelPaginationArgs) {
  const fetchInFlightRef = useRef(false)

  useEffect(() => {
    const root = scrollRootRef.current
    const sentinel = sentinelRef.current
    if (root === null || sentinel === null) return

    const observer = new IntersectionObserver(
      entries => {
        const hit = entries.some(en => en.isIntersecting)
        if (!hit || !hasMore || loading || fetchInFlightRef.current) return
        fetchInFlightRef.current = true
        fireAndForget(
          Promise.resolve(fetchMore()).finally(() => {
            fetchInFlightRef.current = false
          })
        )
      },
      { root, rootMargin: '0px', threshold: 0 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [scrollRootRef, sentinelRef, hasMore, loading, fetchMore])
}
