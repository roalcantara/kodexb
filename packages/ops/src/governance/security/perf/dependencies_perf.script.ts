#!/usr/bin/env bun
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import { chdirToRepoRoot } from '../../../support/lib/shared/repo_root.script'
import { runDependenciesCheck } from '../checks/dependencies.script'

function main(): number {
  const parsed = Number(process.env.SECURITY_PERF_ITERATIONS ?? '100')
  const iterations = Number.isFinite(parsed) && parsed > 0 ? parsed : 100
  const dir = mkdtempSync(path.join(tmpdir(), 'dep-perf-'))
  const cves = path.join(dir, 'cve.list.yml')

  try {
    const repoRoot = chdirToRepoRoot()
    const lock = path.join(repoRoot, 'bun.lock')
    writeFileSync(cves, '- package: vulnerable-lib\n  version: 1.0.0\n  cve: CVE-2099-0001\n  severity: critical\n')

    // jscpd:ignore-start
    const samples: number[] = []
    for (let i = 0; i < iterations; i++) {
      const start = performance.now()
      runDependenciesCheck(lock, cves)
      samples.push(performance.now() - start)
    }

    const sorted = samples.toSorted((a, b) => a - b)
    const p95 = sorted.length > 0 ? (sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)] ?? 0) : 0
    console.log(JSON.stringify({ scope: 'dependencies-noop', iterations, p95Ms: Number(p95.toFixed(3)) }))
    return 0
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
  // jscpd:ignore-end
}

if (import.meta.main) process.exit(main())
