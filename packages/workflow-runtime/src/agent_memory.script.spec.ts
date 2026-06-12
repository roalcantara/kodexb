import { afterEach, describe, expect, it } from 'bun:test'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { appendInsights, loadCatalog, loadInsights, mergeInsightsIntoStageMemory } from './agent_memory.script'
import type { RetroInsight } from './retrospective.script'

function makeInsight(overrides?: Partial<RetroInsight>): RetroInsight {
  return {
    insight_id: 'ri-deadbeef',
    run_id: 'test-run-1',
    timestamp: '2026-06-10T12:00:00.000Z',
    recommendation: {
      rank: 1,
      description: 'Test insight — high failure rate in plan stage',
      eventIds: [0, 2],
      severity: 'high'
    },
    tags: ['severity:high', 'retro:test-run-1'],
    ...overrides
  }
}

describe('agent_memory', () => {
  let scratchDir: string

  afterEach(() => {
    if (scratchDir && existsSync(scratchDir)) {
      rmSync(scratchDir, { recursive: true, force: true })
    }
  })

  it('AWO-8 AC3: append insight entries with insight_id, run_id, timestamp', () => {
    scratchDir = mkdtempSync(path.join(tmpdir(), 'am-test-'))
    const catalogPath = path.join(scratchDir, 'agent_memory.json')

    const insight = makeInsight()
    appendInsights(catalogPath, [insight])

    expect(existsSync(catalogPath)).toBe(true)
    const raw = JSON.parse(readFileSync(catalogPath, 'utf-8'))

    expect(raw.schema_version).toBe('009.1.0')
    expect(raw.entries.length).toBe(1)
    const entry = raw.entries[0]
    expect(entry.insight_id).toBe('ri-deadbeef')
    expect(entry.run_id).toBe('test-run-1')
    expect(entry.timestamp).toBe('2026-06-10T12:00:00.000Z')
    expect(entry.description).toContain('high failure rate')
    expect(entry.severity).toBe('high')
    expect(entry.eventIds).toEqual([0, 2])
    expect(entry.tags).toContain('severity:high')
  })

  it('AWO-8 AC4: next run loads catalog insights into stage memory', () => {
    scratchDir = mkdtempSync(path.join(tmpdir(), 'am-test-'))
    const catalogPath = path.join(scratchDir, 'agent_memory.json')

    const insight1 = makeInsight({ insight_id: 'ri-aaa' })
    const insight2 = makeInsight({ insight_id: 'ri-bbb', run_id: 'test-run-2' })
    appendInsights(catalogPath, [insight1, insight2])

    const loaded = loadInsights(catalogPath)
    expect(loaded.length).toBe(2)
    expect(loaded[0]?.insight_id).toBe('ri-aaa')
    expect(loaded[1]?.insight_id).toBe('ri-bbb')

    const stageMemory = mergeInsightsIntoStageMemory(loaded, { existingKey: 'val' })
    expect(stageMemory.existingKey).toBe('val')
    expect(Array.isArray(stageMemory.agent_memory_insights)).toBe(true)
    const memInsights = stageMemory.agent_memory_insights as Record<string, unknown>[]
    expect(memInsights.length).toBe(2)
    expect(memInsights[0]?.insight_id).toBe('ri-aaa')
    expect(memInsights[0]?.description).toBeDefined()
    expect(memInsights[0]?.severity).toBe('high')
  })

  it('appendInsights creates directory when it does not exist', () => {
    scratchDir = mkdtempSync(path.join(tmpdir(), 'am-test-'))
    const nestedPath = path.join(scratchDir, 'nested', 'deep', 'agent_memory.json')

    const insight = makeInsight()
    appendInsights(nestedPath, [insight])

    expect(existsSync(nestedPath)).toBe(true)
  })

  it('loadCatalog returns default for nonexistent file', () => {
    const catalog = loadCatalog('/nonexistent/agent_memory.json')
    expect(catalog.schema_version).toBe('009.1.0')
    expect(catalog.entries).toEqual([])
  })
})
