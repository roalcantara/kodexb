import type { RpcKnowledge } from '@shared/rpc'
import { useEffect, useRef } from 'react'
import { recordEntryVisitFireAndForget } from '../../utils/list/record_entry_visit.util'

/** Records a frecency visit when detail/split shows a new entry id. */
export function useRecordDetailVisit(detailEntry: RpcKnowledge | null): void {
  const lastIdRef = useRef<number | null>(null)

  useEffect(() => {
    const id = detailEntry?.id ?? null
    if (id === null) {
      lastIdRef.current = null
      return
    }
    if (lastIdRef.current === id) return
    lastIdRef.current = id
    recordEntryVisitFireAndForget(id)
  }, [detailEntry?.id])
}
