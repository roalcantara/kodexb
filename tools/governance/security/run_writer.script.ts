import { appendFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import type { SecurityRunEvent } from './events.types.ts'

export type WriteRunEventResult = {
  ok: boolean
  filePath: string
  error?: string
}

function dateStamp(now: Date): string {
  return now.toISOString().slice(0, 10)
}

function sanitizeRunId(runId: string): string | null {
  return /^[a-zA-Z0-9._-]+$/.test(runId) ? runId : null
}

export function appendSecurityRunEvent(
  rootDir: string,
  runId: string,
  event: SecurityRunEvent,
  now = new Date()
): WriteRunEventResult {
  const dir = path.join(rootDir, 'tmp', 'security', dateStamp(now))
  const safeRunId = sanitizeRunId(runId)
  if (!safeRunId) {
    return { ok: false, filePath: dir, error: 'Invalid runId' }
  }
  const filePath = path.join(dir, `${safeRunId}.ndjson`)
  try {
    mkdirSync(dir, { recursive: true })
    appendFileSync(filePath, `${JSON.stringify(event)}\n`, 'utf8')
    return { ok: true, filePath }
  } catch (error) {
    return {
      ok: false,
      filePath,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}
