import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const GATE_RESUME_HINTS: Record<string, string> = {
  'review-spec': 'Read spec.md and run: mise run spec kit next --approve',
  'review-plan': 'Read plan.md and run: mise run spec kit next --approve',
  'review-tasks': 'Read tasks.md + handoff.md and run: mise run spec kit next --approve',
  'review-handoff': 'Verify handoff criteria and run: mise run spec kit next --approve'
}

const GATE_STAGE_PATTERN = /^[a-z][a-z0-9-]*$/

function assertValidGateStage(gateStage: string): void {
  if (!GATE_STAGE_PATTERN.test(gateStage) || !Object.hasOwn(GATE_RESUME_HINTS, gateStage)) {
    throw new Error(`kit gate: invalid gate stage "${gateStage}"`)
  }
}

export function humanGateBlocked(featureDir: string, _runId: string, gateStage: string): boolean {
  assertValidGateStage(gateStage)
  const markerPath = gateMarkerPath(featureDir, gateStage)
  return !existsSync(markerPath)
}

export function clearGate(featureDir: string, runId: string, gateStage: string): void {
  assertValidGateStage(gateStage)
  const markerPath = gateMarkerPath(featureDir, gateStage)
  mkdirSync(path.dirname(markerPath), { recursive: true })
  writeFileSync(markerPath, JSON.stringify({ stage: gateStage, runId, approved: new Date().toISOString() }))
}

export function printGateResumeHint(gateStage: string): void {
  const hint = GATE_RESUME_HINTS[gateStage] ?? `Clear gate "${gateStage}" with: mise run spec kit next --approve`
  process.stderr.write(`kit next: human gate "${gateStage}" requires approval\n`)
  process.stderr.write(`${hint}\n`)
}

function gateMarkerPath(featureDir: string, gateStage: string): string {
  return path.join(featureDir, '.gates', `${gateStage}.approved`)
}

export function isGateStage(stage: string): boolean {
  return Object.hasOwn(GATE_RESUME_HINTS, stage)
}
