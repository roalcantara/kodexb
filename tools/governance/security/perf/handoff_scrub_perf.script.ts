#!/usr/bin/env bun
import { performance } from 'node:perf_hooks'
import { scrubPrompt } from '../handoff_scrub.script.ts'

function main(): number {
  const parsed = Number(process.env.SECURITY_PERF_ITERATIONS ?? '100')
  const iterations = Number.isFinite(parsed) && parsed >= 1 ? parsed : 100
  const body = 'safe prompt body '.repeat(3000) // <= 50 KiB representative payload
  const samples: number[] = []

  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    scrubPrompt(body)
    samples.push(performance.now() - start)
  }

  const sorted = samples.toSorted((a, b) => a - b)
  const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0
  console.log(JSON.stringify({ scope: 'handoff-scrub', iterations, p95Ms: Number(p95.toFixed(3)) }))
  return 0
}

if (import.meta.main) process.exit(main())
