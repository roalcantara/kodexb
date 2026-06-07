#!/usr/bin/env bun
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import { runSecretsCheck } from '../checks/secrets.check.script.ts'

function main(): number {
  const iterations = Number(process.env.SECURITY_PERF_ITERATIONS ?? '100')
  const dir = mkdtempSync(path.join(tmpdir(), 'secrets-perf-'))
  const file = path.join(dir, 'fixture.txt')

  try {
    writeFileSync(file, `token = ${'A'.repeat(32)}\n`.repeat(200))
    const samples: number[] = []

    // jscpd:ignore-start
    for (let i = 0; i < iterations; i++) {
      const start = performance.now()
      runSecretsCheck([file])
      samples.push(performance.now() - start)
    }

    const sorted = samples.toSorted((a, b) => a - b)
    const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0
    // jscpd:ignore-end
    console.log(JSON.stringify({ scope: 'secrets', iterations, p95Ms: Number(p95.toFixed(3)) }))
    return 0
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

if (import.meta.main) process.exit(main())
