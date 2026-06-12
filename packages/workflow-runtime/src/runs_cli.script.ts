#!/usr/bin/env bun
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { bestEffortPrune } from './workflow_run.script'

const RUNS_ROOT = 'tmp/workflow-runs'

const RE_LEADING_DIGITS = /^\d+-/
const DURATION_ROUND_FACTOR = 100

type Action = 'list' | 'show' | 'tail' | 'prune'

function isValidAction(s: string): s is Action {
  return ['list', 'show', 'tail', 'prune'].includes(s)
}

export function parseArgs(argv: string[]): { action: Action; runId?: string } {
  const actionStr = argv[0]
  if (!actionStr || !isValidAction(actionStr)) {
    console.error('spec runs: action must be list|show|tail|prune')
    process.exit(2)
  }
  const args: { action: Action; runId?: string } = { action: actionStr }
  if (actionStr === 'show') {
    args.runId = argv[1]
    if (!args.runId) {
      console.error('spec runs show: <run_id> required')
      process.exit(2)
    }
  }
  return args
}

type RunSummary = {
  runId: string
  slug: string
  lastPhase: string
  totalDurationMs: number
  result: string
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: pre-existing complexity, refactor deferred
function collectRuns(root: string): RunSummary[] {
  if (!existsSync(root)) return []
  const runs: RunSummary[] = []
  for (const dateDir of readdirSync(root).sort().reverse()) {
    const datePath = path.join(root, dateDir)
    if (!statSync(datePath).isDirectory()) continue
    for (const file of readdirSync(datePath).sort().reverse()) {
      if (!file.endsWith('.ndjson')) continue
      const fullPath = path.join(datePath, file)
      const content = readFileSync(fullPath, 'utf-8').trim()
      const events = content
        ? content
            .split('\n')
            .filter(Boolean)
            .map(l => JSON.parse(l))
        : []
      const first = events[0] as Record<string, unknown> | undefined
      const slug = first?.feature_dir ? path.basename(String(first.feature_dir)).replace(RE_LEADING_DIGITS, '') : '?'
      const last = events[events.length - 1] as Record<string, unknown> | undefined
      const lastPhase = (last?.type as string) ?? '?'
      const totalDurationMs = events.reduce(
        (sum, e) => sum + (((e as Record<string, unknown>).duration_ms as number) ?? 0),
        0
      )
      runs.push({
        runId: file.replace('.ndjson', ''),
        slug,
        lastPhase,
        totalDurationMs: Math.round(totalDurationMs * DURATION_ROUND_FACTOR) / DURATION_ROUND_FACTOR,
        result: last?.type === 'gate' ? 'pass' : 'incomplete'
      })
    }
  }
  return runs
}

export function listRuns(limit = 20, root = RUNS_ROOT): void {
  bestEffortPrune()
  const runs = collectRuns(root).slice(0, limit)
  for (const r of runs) {
    console.log(`${r.runId}  ${r.slug}  ${r.lastPhase}  ${r.totalDurationMs}ms  ${r.result}`)
  }
}

export function showRun(runId: string, root = RUNS_ROOT): void {
  if (!existsSync(root)) {
    console.error(`spec runs show: no runs at ${root}`)
    process.exit(1)
  }
  for (const dateDir of readdirSync(root)) {
    const filePath = path.join(root, dateDir, `${runId}.ndjson`)
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, 'utf-8')
      process.stdout.write(content)
      return
    }
  }
  console.error(`spec runs show: run ${runId} not found`)
  process.exit(1)
}

export function tailRun(root = RUNS_ROOT): void {
  if (!existsSync(root)) {
    console.error('spec runs tail: no runs found')
    process.exit(1)
  }
  const today = new Date().toISOString().slice(0, 10)
  const todayPath = path.join(root, today)
  if (!existsSync(todayPath)) {
    console.error(`spec runs tail: no runs for ${today}`)
    process.exit(1)
  }
  const files = readdirSync(todayPath)
    .filter(f => f.endsWith('.ndjson'))
    .sort()
  if (files.length === 0) {
    console.error(`spec runs tail: no runs for ${today}`)
    process.exit(1)
  }
  const last = files[files.length - 1]
  if (!last) {
    console.error(`spec runs tail: empty files list for ${today}`)
    process.exit(1)
  }
  const content = readFileSync(path.join(todayPath, last), 'utf-8')
  process.stdout.write(content)
}

export function pruneRuns(): void {
  bestEffortPrune()
}

function main(): void {
  const args = parseArgs(process.argv.slice(2))
  switch (args.action) {
    case 'list':
      listRuns()
      break
    case 'show':
      showRun(args.runId ?? '')
      break
    case 'tail':
      tailRun()
      break
    case 'prune':
      pruneRuns()
      break
  }
}

if (import.meta.main) main()
