/**
 * Run executable Evidence commands from handoff.md AC table.
 * Used by `mise run spec closeout` before spec ready.
 */
import { readFileSync } from 'node:fs'
import { extractEvidenceCommands, resolveHandoffPath } from './workflow/review_handoff_core.script'

export type HandoffEvidenceRun = {
  acId: string
  command: string
  exitCode: number
  skipped: boolean
  skipReason?: string
}

export type RunHandoffEvidenceOpts = {
  featureDir: string
  root: string
  handoffPath?: string
  includeOperatorSmoke?: boolean
  dryRun?: boolean
}

export function collectHandoffEvidenceRuns(
  handoffMd: string,
  opts: { includeOperatorSmoke?: boolean } = {}
): { acId: string; command: string; operatorSmoke: boolean }[] {
  const includeSmoke = opts.includeOperatorSmoke === true
  const out: { acId: string; command: string; operatorSmoke: boolean }[] = []
  for (const row of extractEvidenceCommands(handoffMd)) {
    if (row.operatorSmoke && !includeSmoke) continue
    for (const command of row.commands) {
      out.push({ acId: row.acId, command, operatorSmoke: row.operatorSmoke })
    }
  }
  return out
}

function runShellCommand(command: string, cwd: string): number {
  const proc = Bun.spawnSync(['bash', '-lc', command], {
    cwd,
    stdout: 'inherit',
    stderr: 'inherit',
    env: process.env
  })
  return proc.exitCode ?? 1
}

export function runHandoffEvidence(opts: RunHandoffEvidenceOpts): {
  ok: boolean
  runs: HandoffEvidenceRun[]
} {
  const handoffPath = opts.handoffPath ?? resolveHandoffPath(opts.featureDir, null)
  const handoffMd = readFileSync(handoffPath, 'utf8')
  const planned = collectHandoffEvidenceRuns(handoffMd, {
    includeOperatorSmoke: opts.includeOperatorSmoke
  })

  const runs: HandoffEvidenceRun[] = []
  for (const item of planned) {
    if (opts.dryRun) {
      runs.push({ acId: item.acId, command: item.command, exitCode: 0, skipped: true, skipReason: 'dry-run' })
      console.log(`[dry-run] ${item.acId}: ${item.command}`)
      continue
    }
    console.error(`handoff evidence ${item.acId}: ${item.command}`)
    const exitCode = runShellCommand(item.command, opts.root)
    runs.push({ acId: item.acId, command: item.command, exitCode, skipped: false })
    if (exitCode !== 0) return { ok: false, runs }
  }

  if (planned.length === 0) {
    console.error('handoff evidence: no runnable commands (operator-smoke rows skipped unless --include-smoke)')
  }
  return { ok: true, runs }
}
