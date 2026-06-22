#!/usr/bin/env bun
/**
 * Dev-only CRG refresh worker: `update --skip-flows` + `detect-changes --brief`.
 * Spawned in the background from `schedule_crg_refresh.script.ts` (post-commit).
 */
import { existsSync, unlinkSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { chdirToRepoRoot } from '../../../support/lib/shared/repo_root.script'
import { crgOnPath } from './crg_refresh_env.script'

export const CRG_RISK_SUMMARY_PID_BASENAME = 'crg-risk-summary.pid'

export function crgRiskSummaryPidPath(root: string): string {
  return path.join(root, 'tmp', CRG_RISK_SUMMARY_PID_BASENAME)
}

export function runCrgRiskSummary(cwd = chdirToRepoRoot()): void {
  if (!crgOnPath()) return

  const update = Bun.spawnSync(['code-review-graph', 'update', '--skip-flows'], {
    cwd,
    stdout: 'inherit',
    stderr: 'inherit',
    env: process.env
  })
  if (update.exitCode !== 0) {
    console.error('CRG risk summary: update exited', update.exitCode ?? 1)
  }

  const detect = Bun.spawnSync(['code-review-graph', 'detect-changes', '--brief'], {
    cwd,
    stdout: 'inherit',
    stderr: 'inherit',
    env: process.env
  })
  if (detect.exitCode !== 0) {
    console.error('CRG risk summary: detect-changes exited', detect.exitCode ?? 1)
  }
}

export function clearCrgRiskSummaryPid(root: string): void {
  const pidPath = crgRiskSummaryPidPath(root)
  if (existsSync(pidPath)) unlinkSync(pidPath)
}

if (import.meta.main) {
  const root = chdirToRepoRoot()
  const pidPath = crgRiskSummaryPidPath(root)
  writeFileSync(pidPath, String(process.pid))
  try {
    runCrgRiskSummary(root)
  } finally {
    clearCrgRiskSummaryPid(root)
  }
  process.exit(0)
}
