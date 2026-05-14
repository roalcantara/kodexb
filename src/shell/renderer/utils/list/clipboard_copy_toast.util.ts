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
