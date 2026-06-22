import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { chdirToRepoRoot } from '../../../support/lib/shared/repo_root.script'
import { crgOnPath, isCrgRefreshEnvironment } from './crg_refresh_env.script'
import { crgRiskSummaryPidPath } from './crg_risk_summary.script'

export function crgRiskSummaryWorkerRunning(root: string): boolean {
  const pidPath = crgRiskSummaryPidPath(root)
  if (!existsSync(pidPath)) return false
  const raw = readFileSync(pidPath, 'utf8').trim()
  const pid = Number(raw)
  if (!Number.isFinite(pid) || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

export function scheduleCrgRiskSummary(root = chdirToRepoRoot()): boolean {
  if (!isCrgRefreshEnvironment()) return false
  if (!crgOnPath()) return false
  if (crgRiskSummaryWorkerRunning(root)) return false

  mkdirSync(path.join(root, 'tmp'), { recursive: true })

  const worker = path.join(root, 'packages/ops/src/governance/policies/hooks/crg_risk_summary.script.ts')
  const proc = Bun.spawn([process.execPath, worker], {
    cwd: root,
    detached: true,
    stdin: 'ignore',
    stdout: 'ignore',
    stderr: 'inherit',
    env: process.env
  })
  proc.unref()
  return true
}

if (import.meta.main) {
  scheduleCrgRiskSummary()
  process.exit(0)
}
