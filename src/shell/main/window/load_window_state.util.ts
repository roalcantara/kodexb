import path from 'node:path'

import type { WindowBounds } from './state'

/**
 * Path to persisted window bounds next to the config file.
 */
export function windowStatePathForConfigFile(configPath: string): string {
  return path.join(path.dirname(configPath), 'window-state.json')
}

function loadWindowStateFrom(
  configPath: string,
  parseText: (text: string) => WindowBounds | null,
  readUtf8: (filePath: string) => string | null
): WindowBounds | null
function loadWindowStateFrom(
  configPath: string,
  parseText: (text: string) => WindowBounds | null,
  readUtf8: (filePath: string) => Promise<string | null>
): Promise<WindowBounds | null>
function loadWindowStateFrom(
  configPath: string,
  parseText: (text: string) => WindowBounds | null,
  readUtf8: (filePath: string) => string | null | Promise<string | null>
): WindowBounds | null | Promise<WindowBounds | null> {
  const filePath = windowStatePathForConfigFile(configPath)
  const parse = (text: string | null): WindowBounds | null => {
    if (text === null) return null
    return parseText(text)
  }
  try {
    const textOrPromise = readUtf8(filePath)
    if (textOrPromise instanceof Promise) {
      return textOrPromise.then(parse).catch(() => null)
    }
    return parse(textOrPromise)
  } catch {
    return null
  }
}

export { loadWindowStateFrom }
