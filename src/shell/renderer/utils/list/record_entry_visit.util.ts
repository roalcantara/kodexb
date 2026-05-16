import { recordEntryVisit } from '../../rpc/client'

/** Records frecency without blocking navigation or copy UX. */
export function recordEntryVisitFireAndForget(id: number): void {
  recordEntryVisit(id).catch(() => undefined)
}
