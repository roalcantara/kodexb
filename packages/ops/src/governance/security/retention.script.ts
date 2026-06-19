import { readdirSync, rmSync, type Stats, statSync } from 'node:fs'
import path from 'node:path'

function isDateDir(name: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(name)
}

export function pruneOlderThan(rootDir: string, days: number, now = new Date()): string[] {
  if (!Number.isFinite(days) || days < 0) {
    throw new RangeError('days must be a non-negative number')
  }
  const securityDir = path.join(rootDir, 'tmp', 'security')
  let entries: string[] = []
  try {
    entries = readdirSync(securityDir)
  } catch {
    return []
  }

  const threshold = new Date(now)
  threshold.setDate(threshold.getDate() - days)

  const removed: string[] = []
  for (const entry of entries) {
    if (!isDateDir(entry)) continue
    const abs = path.join(securityDir, entry)
    let st: Stats
    try {
      st = statSync(abs)
    } catch {
      continue
    }
    if (!st.isDirectory()) continue
    const createdAt = new Date(entry)
    if (Number.isNaN(createdAt.getTime())) continue
    if (createdAt < threshold) {
      try {
        rmSync(abs, { recursive: true, force: true })
        removed.push(abs)
      } catch {
        // Ignore failures; we can try again on the next run
      }
    }
  }

  return removed
}
