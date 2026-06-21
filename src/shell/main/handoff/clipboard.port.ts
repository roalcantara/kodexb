import { getLogger } from '@shared/logging'

const log = getLogger(['kb', 'main', 'handoff', 'clipboard'])

function getUtils(): { clipboardReadText: () => string | null; clipboardWriteText: (text: string) => void } {
  // Lazy require so bun test mock.module can intercept before first call
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  // biome-ignore lint/style/noCommonJs: lazy require allows bun test mock.module to intercept
  const { Utils } = require('electrobun/bun') as {
    Utils: { clipboardReadText: () => string | null; clipboardWriteText: (text: string) => void }
  }
  return Utils
}

export function readSystemClipboard(): string {
  try {
    return getUtils().clipboardReadText() ?? ''
  } catch (e) {
    log.debug('readSystemClipboard failed, returning empty string', { error: String(e) })
    return ''
  }
}

export function writeSystemClipboard(text: string): void {
  try {
    getUtils().clipboardWriteText(text)
  } catch (e) {
    log.debug('clipboard write failed (len={n})', { n: text.length, error: String(e) })
  }
}
