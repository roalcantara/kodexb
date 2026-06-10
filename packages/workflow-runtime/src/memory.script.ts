import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'

export type MemoryConflictPolicy = 'prefer_latest' | 'prompt_user' | 'block'

export function stageMemoryPath(rootDir: string, dateStr: string, runId: string, stage: string): string {
  return path.join(rootDir, dateStr, `${runId}.memory.${stage}.json`)
}

export function sharedMemoryPath(rootDir: string, dateStr: string, runId: string): string {
  return path.join(rootDir, dateStr, `${runId}.shared.json`)
}

export function ensureStageMemory(
  rootDir: string,
  dateStr: string,
  runId: string,
  stage: string
): Record<string, unknown> {
  const p = stageMemoryPath(rootDir, dateStr, runId, stage)
  mkdirSync(path.dirname(p), { recursive: true })
  if (!existsSync(p)) {
    writeFileSync(p, '{}')
    return {}
  }
  try {
    return JSON.parse(readFileSync(p, 'utf-8'))
  } catch (err) {
    console.error(`[memory] failed to parse ${p}: ${err}`)
    return {}
  }
}

export function writeStageMemory(
  rootDir: string,
  dateStr: string,
  runId: string,
  stage: string,
  data: Record<string, unknown>
): void {
  const p = stageMemoryPath(rootDir, dateStr, runId, stage)
  mkdirSync(path.dirname(p), { recursive: true })
  writeFileSync(p, JSON.stringify(data, null, 2))
}

export function readSharedMemory(rootDir: string, dateStr: string, runId: string): Record<string, unknown> {
  const p = sharedMemoryPath(rootDir, dateStr, runId)
  if (!existsSync(p)) return {}
  try {
    return JSON.parse(readFileSync(p, 'utf-8'))
  } catch (err) {
    console.error(`[memory] failed to parse ${p}: ${err}`)
    return {}
  }
}

export function writeSharedMemory(
  rootDir: string,
  dateStr: string,
  runId: string,
  data: Record<string, unknown>
): void {
  const p = sharedMemoryPath(rootDir, dateStr, runId)
  mkdirSync(path.dirname(p), { recursive: true })
  writeFileSync(p, JSON.stringify(data, null, 2))
}

export function resolveMemoryConflict(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>,
  policy: MemoryConflictPolicy
): { ok: boolean; data: Record<string, unknown>; conflict?: string } {
  const conflicting = Object.keys(incoming).filter(k => k in existing && existing[k] !== incoming[k])

  if (policy === 'block' && conflicting.length > 0) {
    return { ok: false, data: existing, conflict: `conflicting keys: ${conflicting.join(', ')}` }
  }

  if (policy === 'prompt_user' && conflicting.length > 0) {
    return { ok: false, data: existing, conflict: `conflict requires user prompt: ${conflicting.join(', ')}` }
  }

  return { ok: true, data: { ...existing, ...incoming } }
}

// biome-ignore lint/style/noMagicNumbers: named constant composition
const MS_PER_DAY = 24 * 60 * 60 * 1000

export function applyRetention(rootDir: string, tmpDays: number): { pruned: number } {
  const tmpCutoff = Date.now() - tmpDays * MS_PER_DAY
  let pruned = 0
  if (!existsSync(rootDir)) return { pruned: 0 }

  for (const entry of readdirSafe(rootDir)) {
    const entryPath = path.join(rootDir, entry)
    const dirTime = new Date(`${entry}T00:00:00Z`).getTime()
    if (Number.isNaN(dirTime) || dirTime >= tmpCutoff) continue
    for (const file of readdirSafe(entryPath)) {
      try {
        rmSync(path.join(entryPath, file), { force: true })
        pruned++
      } catch {
        /* intentional noop — skip individual file */
      }
    }
    try {
      rmSync(entryPath, { recursive: true, force: true })
    } catch {
      /* intentional noop — skip directory */
    }
  }
  return { pruned }
}

function readdirSafe(p: string): string[] {
  try {
    return readdirSync(p)
  } catch {
    return []
  }
}
