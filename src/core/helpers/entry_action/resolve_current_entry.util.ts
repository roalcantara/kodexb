export type ViewStateForEntry = 'list' | 'split' | 'detail'

export type ResolveCurrentEntryOpts<T extends { id: number }> = {
  viewState: ViewStateForEntry
  selectedId: number | null
  detailEntry: T | null
  rows: readonly T[]
  detailPanelHasFocus: boolean
}

/** Resolves the entry targeted by Return / palette for the current view. */
export function resolveCurrentEntry<T extends { id: number }>(opts: ResolveCurrentEntryOpts<T>): T | null {
  if (opts.viewState === 'detail') return opts.detailEntry
  if (opts.viewState === 'split' && opts.detailPanelHasFocus && opts.detailEntry) return opts.detailEntry
  if (opts.selectedId != null) {
    const selected = opts.rows.find(r => r.id === opts.selectedId)
    if (selected) return selected
  }
  return opts.detailEntry
}
