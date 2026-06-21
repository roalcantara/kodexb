import { getLogger } from '@shared/logging'
import { Utils } from 'electrobun/bun'

const log = getLogger(['kb', 'main', 'handoff', 'clipboard'])

export function readSystemClipboard(): string {
  try {
    return Utils.clipboardReadText() ?? ''
  } catch (e) {
    log.debug('readSystemClipboard failed, returning empty string', { error: String(e) })
    return ''
  }
}

export function writeSystemClipboard(text: string): void {
  try {
    Utils.clipboardWriteText(text)
  } catch (e) {
    log.debug('clipboard write failed (len={n})', { n: text.length, error: String(e) })
  }
}
