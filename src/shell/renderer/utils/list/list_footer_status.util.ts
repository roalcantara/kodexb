export type ListFooterStatusInput = {
  matchTotal: number | null
  showing: number
  pageSize: number
  loading: boolean
}

export function formatListFooterStatus(i: ListFooterStatusInput): string {
  if (i.loading && i.matchTotal === null) {
    return 'Loading results…'
  }
  if (i.matchTotal === null) {
    return i.showing === 1 ? `${i.showing} result` : `${i.showing} results`
  }

  const total = i.matchTotal
  const showing = i.showing
  const ps = Math.max(1, i.pageSize)
  const totalPages = total === 0 ? 1 : Math.max(1, Math.ceil(total / ps))
  const currentPage = total === 0 ? 1 : Math.min(totalPages, Math.max(1, Math.ceil(showing / ps)))
  const resultsWord = total === 1 ? 'result' : 'results'
  const entryWord = showing === 1 ? 'entry' : 'entries'
  return `${total} ${resultsWord} | showing ${showing} ${entryWord} (page ${currentPage} of ${totalPages})`
}
