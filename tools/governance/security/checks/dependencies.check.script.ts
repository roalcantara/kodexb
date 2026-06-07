import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { SecurityFinding, SecuritySeverity } from '../security.types.ts'
import { defaultGitRunner, type GitRunner, parseLockDelta, type LockDelta } from './dependencies.delta.script.ts'

type CveRow = {
  packageName: string
  version: string
  cve: string
  severity: SecuritySeverity
}

function parseCveList(filePath: string): CveRow[] {
  try {
    const text = readFileSync(filePath, 'utf8')
    const rows: CveRow[] = []
    const chunks = text.split('\n- ').map((chunk, index) => (index === 0 ? chunk.replace(/^-\s*/, '') : chunk))
    for (const chunk of chunks) {
      if (!chunk.trim()) continue
      const packageName = chunk.match(/packageName:\s*["']?([^"'\s]+)["']?/)?.[1]?.trim()
      const version = chunk.match(/version:\s*["']?([^"'\s]+)["']?/)?.[1]?.trim()
      const cve = chunk.match(/cve:\s*["']?([^"'\s]+)["']?/)?.[1]?.trim()
      const severityRaw = chunk.match(/severity:\s*["']?([^"'\s]+)["']?/)?.[1]?.trim() as SecuritySeverity | undefined
      if (!packageName || !version || !cve || !severityRaw) continue
      rows.push({ packageName, version, cve, severity: severityRaw })
    }
    return rows
  } catch {
    return []
  }
}

function checkBunAudit(lockfilePath: string): SecurityFinding[] {
  const run = Bun.spawnSync(['bun', 'audit', '--json'], {
    cwd: path.dirname(lockfilePath),
    stdout: 'pipe',
    stderr: 'pipe'
  })

  if (!run.success) return []
  try {
    const payload = JSON.parse(new TextDecoder().decode(run.stdout)) as {
      advisories?: Array<{ id?: string; severity?: string; title?: string }>
    }
    const advisories = payload.advisories ?? []
    return advisories
      .filter(item => item.severity === 'critical' || item.severity === 'high')
      .map((item, index) => ({
        id: `dep:audit:${item.id ?? index}`,
        severity: (item.severity as SecuritySeverity) ?? 'high',
        file: lockfilePath,
        rule: 'bun-audit',
        message: item.title ?? 'bun audit advisory'
      }))
  } catch {
    return []
  }
}

export function runDependenciesCheck(
  lockfilePath: string,
  cveListPath: string,
  base: string = 'HEAD',
  gitRunner: GitRunner = defaultGitRunner
): SecurityFinding[] {
  const findings: SecurityFinding[] = []
  let delta: LockDelta[] = []
  try {
    delta = parseLockDelta(lockfilePath, base, gitRunner)
  } catch {
    return [{
      id: 'dep:fatal:malformed',
      severity: 'critical',
      file: lockfilePath,
      rule: 'malformed-lockfile',
      message: 'bun.lock is malformed or unparseable.'
    }]
  }
  const cves = parseCveList(cveListPath)

  for (const dep of delta) {
    const hit = cves.find(cve => cve.packageName === dep.packageName && cve.version === dep.version)
    if (!hit) continue
    findings.push({
      id: `dep:cve:${hit.cve}:${dep.packageName}:${dep.version}`,
      severity: hit.severity,
      file: lockfilePath,
      rule: 'cve-list',
      message: `${dep.packageName}@${dep.version} matches ${hit.cve}`
    })
  }

  return [...findings, ...checkBunAudit(lockfilePath)]
}
