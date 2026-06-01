import { STOP_WORDS } from './stop_words.const'

const WORD_SPLIT_RE = /[\s,.;:!?()[\]{}'"<>/\\|`~@#$%^&*+=_-]+/

export function extractKeywords(text: string): string[] {
  return text.split(WORD_SPLIT_RE).filter(w => w.length > 2 && !STOP_WORDS.has(w))
}
