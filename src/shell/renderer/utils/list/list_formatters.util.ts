/** Max runes shown inside the quoted clipboard success toast (full string is still copied). */
export const CLIPBOARD_COPIED_TOAST_PREVIEW_MAX = 100

function previewForClipboardCopiedToast(full: string): string {
  if (full.length <= CLIPBOARD_COPIED_TOAST_PREVIEW_MAX) return full
  return `${full.slice(0, CLIPBOARD_COPIED_TOAST_PREVIEW_MAX)}...`
}

/**
 * Success toast after copying `copiedText` to the clipboard (palette **Copy**, list **⌘C**, etc.).
 * Preview is trimmed for display only; empty clipboard text uses a neutral message.
 */
export function clipboardCopiedToastMessage(copiedText: string): string {
  if (copiedText === '') {
    return 'Copied to clipboard'
  }
  const preview = previewForClipboardCopiedToast(copiedText)
  const safe = preview.replace(/'/g, '\u2019')
  return `'${safe}' copied to clipboard`
}

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
