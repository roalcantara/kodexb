#!/usr/bin/env bun
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import { runDependenciesCheck } from '../checks/dependencies.script.ts'

function main(): number {
  const iterations = Number(process.env.SECURITY_PERF_ITERATIONS ?? '100')
  const dir = mkdtempSync(path.join(tmpdir(), 'dep-perf-'))
  const lock = path.join(dir, 'bun.lock')
  const cves = path.join(dir, 'cve.list.yml')

  try {
    writeFileSync(lock, 'safe-lib 1.2.3\n')
    writeFileSync(cves, '- package: vulnerable-lib\n  version: 1.0.0\n  cve: CVE-2099-0001\n  severity: critical\n')

    // jscpd:ignore-start
    const samples: number[] = []
    for (let i = 0; i < iterations; i++) {
      const start = performance.now()
      runDependenciesCheck(lock, cves)
      samples.push(performance.now() - start)
    }

    const sorted = samples.toSorted((a, b) => a - b)
    const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0
    console.log(JSON.stringify({ scope: 'dependencies-noop', iterations, p95Ms: Number(p95.toFixed(3)) }))
    return 0
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
  // jscpd:ignore-end
}

if (import.meta.main) process.exit(main())
