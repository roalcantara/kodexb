import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { Type } from '@sinclair/typebox'
import { Value } from '@sinclair/typebox/value'
import type { RetroInsight } from './retrospective.script.ts'

export type AgentMemoryEntry = {
  insight_id: string
  run_id: string
  timestamp: string
  description: string
  severity: string
  eventIds: number[]
  tags: string[]
}

export type AgentMemoryCatalog = {
  schema_version: '009.1.0'
  entries: AgentMemoryEntry[]
}

const AgentMemoryEntrySchema = Type.Object({
  insight_id: Type.String(),
  run_id: Type.String(),
  timestamp: Type.String(),
  description: Type.String(),
  severity: Type.String(),
  eventIds: Type.Array(Type.Number()),
  tags: Type.Array(Type.String())
})

const AgentMemoryCatalogSchema = Type.Object({
  schema_version: Type.Literal('009.1.0'),
  entries: Type.Array(AgentMemoryEntrySchema)
})

export function defaultCatalog(): AgentMemoryCatalog {
  return { schema_version: '009.1.0', entries: [] }
}

export function loadCatalog(filePath: string): AgentMemoryCatalog {
  if (!existsSync(filePath)) return defaultCatalog()
  try {
    const raw = JSON.parse(readFileSync(filePath, 'utf-8'))
    if (!Value.Check(AgentMemoryCatalogSchema, raw)) {
      return defaultCatalog()
    }
    return raw as AgentMemoryCatalog
  } catch {
    return defaultCatalog()
  }
}

export function appendInsights(filePath: string, insights: RetroInsight[]): void {
  const dir = path.dirname(filePath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  const catalog = loadCatalog(filePath)

  for (const insight of insights) {
    const entry: AgentMemoryEntry = {
      insight_id: insight.insight_id,
      run_id: insight.run_id,
      timestamp: insight.timestamp,
      description: insight.recommendation.description,
      severity: insight.recommendation.severity,
      eventIds: insight.recommendation.eventIds,
      tags: insight.tags
    }
    catalog.entries.push(entry)
  }

  writeFileSync(filePath, JSON.stringify(catalog, null, 2), 'utf-8')
}

export function loadInsights(filePath: string): AgentMemoryEntry[] {
  const catalog = loadCatalog(filePath)
  return catalog.entries
}

/**
 * Projects agent memory insights into stage-scoped memory.
 * Included fields: insight_id, description, severity, tags.
 * Intentionally omitted: run_id, timestamp, eventIds (keep stage memory minimal).
 */
export function mergeInsightsIntoStageMemory(
  insights: AgentMemoryEntry[],
  stageMemory: Record<string, unknown>
): Record<string, unknown> {
  return {
    ...stageMemory,
    agent_memory_insights: insights.map(i => ({
      insight_id: i.insight_id,
      description: i.description,
      severity: i.severity,
      tags: i.tags
    }))
  }
}
