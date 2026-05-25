import { existsSync, readFileSync } from 'node:fs'
import { mkdir, rename } from 'node:fs/promises'
import path from 'node:path'
import { loadWindowStateFrom, windowStatePathForConfigFile } from './load_window_state.util'

export type WindowBounds = {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Validate the bounds of a window.
 * @param b - The bounds to validate by checking if all fields are finite and dimensions are strictly positive.
 * @returns `true` if the bounds are valid, `false` otherwise.
 */
export function validateBounds(b: WindowBounds): boolean {
  return (
    Number.isFinite(b.x) &&
    Number.isFinite(b.y) &&
    Number.isFinite(b.width) &&
    Number.isFinite(b.height) &&
    b.width > 0 &&
    b.height > 0
  )
}

/**
 * Parse the window state JSON.
 * @param text - The text to parse.
 * @returns The window state or `null` if the text is not valid JSON.
 */
export function parseWindowStateJson(text: string): WindowBounds | null {
  let raw: unknown
  try {
    raw = JSON.parse(text) as unknown
  } catch {
    return null
  }
  if (raw === null || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const x = o.x
  const y = o.y
  const width = o.width
  const height = o.height
  if (typeof x !== 'number' || typeof y !== 'number' || typeof width !== 'number' || typeof height !== 'number') {
    return null
  }
  const bounds: WindowBounds = { x, y, width, height }
  return validateBounds(bounds) ? bounds : null
}

/**
 * Read persisted bounds synchronously for use before `BrowserWindow` construction.
 * @param configPath - The path to the config file.
 * @returns The window state or `null` if the file does not exist or the text is not valid JSON.
 */
export const loadWindowStateSync = (configPath: string): WindowBounds | null =>
  loadWindowStateFrom(configPath, parseWindowStateJson, filePath => {
    if (!existsSync(filePath)) return null
    return readFileSync(filePath, 'utf8')
  })

/**
 * Read persisted bounds asynchronously for use before `BrowserWindow` construction.
 * @param configPath - The path to the config file.
 * @returns The window state or `null` if the file does not exist or the text is not valid JSON.
 */
export const loadWindowStateAsync = (configPath: string): Promise<WindowBounds | null> =>
  loadWindowStateFrom(configPath, parseWindowStateJson, async filePath => {
    const f = Bun.file(filePath)
    if (!(await f.exists())) return null
    return f.text()
  })

/**
 * Save the window state to a file.
 * @param configPath - The path to the config file.
 * @param bounds - The bounds to save.
 * @returns The window state or `null` if the file does not exist or the text is not valid JSON.
 */
export const saveWindowState = async (configPath: string, bounds: WindowBounds): Promise<void> => {
  const filePath = windowStatePathForConfigFile(configPath)
  await mkdir(path.dirname(filePath), { recursive: true })
  const tmp = `${filePath}.tmp`
  const payload = `${JSON.stringify(bounds, null, 2)}\n`
  await Bun.write(tmp, payload)
  await rename(tmp, filePath)
}
