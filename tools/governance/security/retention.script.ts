import { readdirSync, rmSync, statSync } from 'node:fs'
import path from 'node:path'

function isDateDir(name: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(name)
}

export function pruneOlderThan(rootDir: string, days: number, now = new Date()): string[] {
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
    const st = statSync(abs)
    if (!st.isDirectory()) continue
    const createdAt = new Date(entry)
    if (Number.isNaN(createdAt.getTime())) continue
    if (createdAt < threshold) {
      rmSync(abs, { recursive: true, force: true })
      removed.push(abs)
    }
  }

  return removed
}
