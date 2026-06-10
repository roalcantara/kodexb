import { randomBytes } from 'node:crypto'
import type { WorkflowEvent } from './workflow_run.script.ts'

export type RetroRecommendation = {
  rank: number
  description: string
  eventIds: number[]
  severity: 'high' | 'medium' | 'low'
}

export type RetroInsight = {
  insight_id: string
  run_id: string
  timestamp: string
  recommendation: RetroRecommendation
  tags: string[]
}

export type RetroOutput = {
  markdown: string
  recommendations: RetroRecommendation[]
  insights: RetroInsight[]
}

type IndexedEvent = {
  idx: number
  event: WorkflowEvent
}

type StageStats = {
  ok: number
  fail: number
  blocked: number
}

function isTaskCompleted(e: WorkflowEvent): boolean {
  return e.type === 'task.completed'
}
function isStageEscalated(e: WorkflowEvent): boolean {
  return e.type === 'stage.escalated'
}
function isDecisionEvent(e: WorkflowEvent): boolean {
  return e.type === 'decision.requested' || e.type === 'decision.answered' || e.type === 'decision.defaulted'
}
function isSandboxViolation(e: WorkflowEvent): boolean {
  return e.type === 'sandbox.violation'
}
function isShutdownBlock(e: WorkflowEvent): boolean {
  return e.type === 'shutdown.requested'
}

type AnyEvent = Record<string, unknown>

const RANDOM_BYTES_LENGTH = 4

function generateInsightId(): string {
  return `ri-${randomBytes(RANDOM_BYTES_LENGTH).toString('hex')}`
}

export function buildRetro(events: WorkflowEvent[], runId: string): RetroOutput {
  const indexed: IndexedEvent[] = events.map((event, idx) => ({ idx, event }))

  const blockers = indexed.filter(({ event }) => {
    const e = event as AnyEvent
    return (
      (isTaskCompleted(event) && e.status === 'fail') ||
      isStageEscalated(event) ||
      isSandboxViolation(event) ||
      isShutdownBlock(event)
    )
  })

  const retries = indexed.filter(({ event }) => event.type === 'stage.retried')

  const interventions = indexed.filter(({ event }) => isDecisionEvent(event))

  const patterns = indexed.filter(({ event }) => {
    const e = event as AnyEvent
    return (
      (isTaskCompleted(event) && e.status === 'ok') || event.type === 'stage.exited' || event.type === 'run.summary'
    )
  })

  const stageStats = new Map<string, StageStats>()
  for (const { event } of indexed) {
    if (!isTaskCompleted(event)) continue
    const e = event as AnyEvent
    const stage = (e.stage as string) ?? 'unknown'
    const stats = stageStats.get(stage) ?? { ok: 0, fail: 0, blocked: 0 }
    if (e.status === 'ok') stats.ok++
    else if (e.status === 'fail') stats.fail++
    else if (e.status === 'cancelled') stats.blocked++
    stageStats.set(stage, stats)
  }

  const failures = indexed.filter(({ event }) => isTaskCompleted(event) && (event as AnyEvent).status === 'fail')

  const recommendations = generateRecommendations(blockers, retries, failures, stageStats)

  const insights: RetroInsight[] = recommendations.map(r => ({
    insight_id: generateInsightId(),
    run_id: runId,
    timestamp: new Date().toISOString(),
    recommendation: r,
    tags: [`severity:${r.severity}`, `retro:${runId}`]
  }))

  const markdown = buildMarkdown(blockers, retries, interventions, patterns, recommendations, runId)

  return { markdown, recommendations, insights }
}

function generateRecommendations(
  blockers: IndexedEvent[],
  retries: IndexedEvent[],
  failures: IndexedEvent[],
  stageStats: Map<string, StageStats>
): RetroRecommendation[] {
  const recs: RetroRecommendation[] = []
  let rank = 0

  if (blockers.length > 0) {
    rank++
    recs.push({
      rank,
      description: `${blockers.length} blocker event(s) detected — investigate root causes for terminal failures`,
      eventIds: blockers.map(b => b.idx),
      severity: 'high'
    })
  }

  if (retries.length > 0) {
    rank++
    recs.push({
      rank,
      description: `${retries.length} retry event(s) observed — consider increasing max_attempts or adjusting backoff`,
      eventIds: retries.map(r => r.idx),
      severity: 'medium'
    })
  }

  for (const [stage, stats] of stageStats) {
    if (stats.fail > stats.ok) {
      rank++
      recs.push({
        rank,
        description: `Stage "${stage}" has more failures (${stats.fail}) than successes (${stats.ok}) — review stage configuration`,
        eventIds: failures
          .filter(f => isTaskCompleted(f.event) && (f.event as AnyEvent).stage === stage)
          .map(f => f.idx),
        severity: 'high'
      })
    } else if (stats.fail > 0 && stats.ok > 0) {
      rank++
      recs.push({
        rank,
        description: `Stage "${stage}" had ${stats.fail} failure(s) out of ${stats.ok + stats.fail} attempts — check for flaky conditions`,
        eventIds: failures
          .filter(f => isTaskCompleted(f.event) && (f.event as AnyEvent).stage === stage)
          .map(f => f.idx),
        severity: 'low'
      })
    }
  }

  return recs
}

function eventSummary(event: WorkflowEvent): string {
  const e = event as AnyEvent
  switch (event.type) {
    case 'task.completed':
      return `[${e.role}] exit=${e.exit_code} stage=${e.stage ?? '-'} cmd=${String(e.command ?? '').slice(0, 60)}`
    case 'task.invoked':
      return `[${e.role}] stage=${e.stage ?? '-'} cmd=${String(e.command ?? '').slice(0, 60)}`
    case 'stage.entered':
      return `stage ${e.stage} entered`
    case 'stage.exited':
      return `stage ${e.stage} exited`
    case 'stage.retried':
      return `stage ${e.stage} retry attempt=${e.attempt ?? '?'}`
    case 'stage.escalated':
      return `stage ${e.stage} escalated`
    case 'decision.requested':
      return `decision requested: ${e.question_id}`
    case 'decision.answered':
      return `decision answered: ${e.question_id}`
    case 'decision.defaulted':
      return `decision defaulted: ${e.question_id}`
    case 'sandbox.violation':
      return `sandbox violation: ${e.descriptor_field} attempted="${e.attempted}"`
    case 'run.summary':
      return `run summary: ${e.outcome}`
    default:
      return event.type
  }
}

function sectionFromEvents(title: string, entries: IndexedEvent[]): string {
  if (entries.length === 0) {
    return `## ${title}\n\nNo ${title.toLowerCase()} recorded.\n`
  }
  const lines = entries.map(({ idx, event }) => `- **[#${idx}]** ${eventSummary(event)} (ts: ${event.ts})`)
  return `## ${title}\n\n${lines.join('\n')}\n`
}

function recommendationsSection(recs: RetroRecommendation[]): string {
  if (recs.length === 0) {
    return '## Recommendations\n\nNo recommendations.\n'
  }
  const lines = recs.map(
    r =>
      `1. **[${r.severity.toUpperCase()}]** ${r.description}\n   - References: ${r.eventIds.map(id => `#${id}`).join(', ')}`
  )
  return `## Recommendations\n\n${lines.join('\n\n')}\n`
}

function buildMarkdown(
  blockers: IndexedEvent[],
  retries: IndexedEvent[],
  interventions: IndexedEvent[],
  patterns: IndexedEvent[],
  recommendations: RetroRecommendation[],
  runId: string
): string {
  const header = `# Workflow Retrospective — ${runId}\n\nGenerated: ${new Date().toISOString()}\n\nEvents analyzed: ${blockers.length + retries.length + interventions.length + patterns.length}\n`

  return [
    header,
    sectionFromEvents('Blockers', blockers),
    sectionFromEvents('Retries', retries),
    sectionFromEvents('Interventions', interventions),
    sectionFromEvents('Successful patterns', patterns),
    recommendationsSection(recommendations)
  ].join('\n')
}
