import { fireAndForget } from '@shared/utils'
import { type RefObject, useEffect } from 'react'

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
  useEffect(() => {
    const root = scrollRootRef.current
    const sentinel = sentinelRef.current
    if (root === null || sentinel === null) return

    const observer = new IntersectionObserver(
      entries => {
        const hit = entries.some(en => en.isIntersecting)
        if (!hit || !hasMore || loading) return
        fireAndForget(fetchMore())
      },
      { root, rootMargin: '120px', threshold: 0 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [scrollRootRef, sentinelRef, hasMore, loading, fetchMore])
}
