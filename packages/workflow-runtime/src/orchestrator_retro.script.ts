import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { appendInsights } from './agent_memory.script.ts'
import type { PersistenceConfig } from './persistence.script.ts'
import { buildRetro } from './retrospective.script.ts'
import type { WorkflowEvent } from './workflow_run.script.ts'

export function writeRunRetrospective(
  ndjsonPath: string | null,
  runId: string,
  dateStr: string,
  persistenceConfig: PersistenceConfig,
  catalogPath: string
): void {
  if (!ndjsonPath || !existsSync(ndjsonPath)) return
  try {
    const raw = readFileSync(ndjsonPath, 'utf-8')
    const lines = raw.trim().split('\n').filter(Boolean)
    const events: WorkflowEvent[] = []
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line)
        if (parsed && typeof parsed === 'object' && parsed.type) events.push(parsed as WorkflowEvent)
      } catch {
        // skip malformed lines
      }
    }
    if (events.length === 0) return
    const retro = buildRetro(events, runId)
    const retroDir = path.join(persistenceConfig.metricsDir, dateStr)
    mkdirSync(retroDir, { recursive: true })
    const retroPath = path.join(retroDir, `${runId}.retro.md`)
    writeFileSync(retroPath, retro.markdown, 'utf-8')
    if (retro.insights.length > 0) appendInsights(catalogPath, retro.insights)
  } catch {
    // retrospective is best-effort; never block terminal
  }
}
