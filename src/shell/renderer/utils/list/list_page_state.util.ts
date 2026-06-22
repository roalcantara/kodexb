export type ListEmptyFlagsInput = {
  rows: readonly unknown[]
  dbStats: { total: number } | null
  loading: boolean
  debouncedSearch: string
}

export function listPageEmptyFlags(data: ListEmptyFlagsInput) {
  const emptyDb = data.dbStats !== null && data.dbStats.total === 0
  const noResults = !data.loading && data.rows.length === 0 && data.debouncedSearch.trim() !== '' && !emptyDb
  const emptyList = !data.loading && data.rows.length === 0 && data.debouncedSearch.trim() === '' && !emptyDb
  return { emptyDb, noResults, emptyList }
}

export type ViewState = 'list' | 'split' | 'detail'
export type ViewAction = 'ADVANCE' | 'RETREAT' | 'CLOSE_TO_LIST'

export type ListWheelScrollGate = {
  showSettings: boolean
  taskSheetVisible: boolean
  filterOpen: boolean
  paletteOpen: boolean
  quickLookupOpen: boolean
  syncModalOpen: boolean
  detailEntry: unknown | null
  viewState: ViewState
}

export function listWheelScrollActive(g: ListWheelScrollGate): boolean {
  if (g.showSettings) return false
  if (g.taskSheetVisible) return false
  if (g.filterOpen) return false
  if (g.paletteOpen) return false
  if (g.quickLookupOpen) return false
  if (g.syncModalOpen) return false
  if (g.detailEntry !== null && g.viewState !== 'split') return false
  return true
}

export function viewReducer(state: ViewState, action: ViewAction): ViewState {
  if (action === 'ADVANCE') {
    return state === 'list' ? 'split' : state === 'split' ? 'detail' : state
  }
  if (action === 'RETREAT') {
    return state === 'detail' ? 'split' : state === 'split' ? 'list' : state
  }
  return 'list'
}
