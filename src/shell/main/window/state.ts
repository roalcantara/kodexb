import { existsSync, readFileSync } from 'node:fs'
import { mkdir, rename } from 'node:fs/promises'
import path from 'node:path'

export type WindowBounds = {
  x: number
  y: number
  width: number
  height: number
}

/** `window-state.json` next to `config.yaml` (same directory as the resolved config file). */
export function windowStatePathForConfigFile(configPath: string): string {
  return path.join(path.dirname(configPath), 'window-state.json')
}

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

/** Read persisted bounds synchronously (for use before `BrowserWindow` construction). */
export function loadWindowStateSync(configPath: string): WindowBounds | null {
  const filePath = windowStatePathForConfigFile(configPath)
  if (!existsSync(filePath)) return null
  try {
    const text = readFileSync(filePath, 'utf8')
    return parseWindowStateJson(text)
  } catch {
    return null
  }
}

export async function loadWindowState(configPath: string): Promise<WindowBounds | null> {
  const filePath = windowStatePathForConfigFile(configPath)
  const f = Bun.file(filePath)
  if (!(await f.exists())) return null
  try {
    const text = await f.text()
    return parseWindowStateJson(text)
  } catch {
    return null
  }
}

export async function saveWindowState(configPath: string, bounds: WindowBounds): Promise<void> {
  const filePath = windowStatePathForConfigFile(configPath)
  await mkdir(path.dirname(filePath), { recursive: true })
  const tmp = `${filePath}.tmp`
  const payload = `${JSON.stringify(bounds, null, 2)}\n`
  await Bun.write(tmp, payload)
  await rename(tmp, filePath)
}
