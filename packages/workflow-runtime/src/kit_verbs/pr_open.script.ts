#!/usr/bin/env bun
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { isKitSmokeMode } from '../kit_smoke.script.ts'

const PR_URL_RE = /https:\/\/github\.com\/[^\s/]+\/[^\s/]+\/pull\/\d+/
const SMOKE_PR_URL = 'https://github.com/example/kb/pull/1'

function writePrRef(runId: string, prUrl: string): void {
  const today = new Date().toISOString().slice(0, 10)
  const dir = path.resolve('tmp/workflow-runs', today, runId)
  mkdirSync(dir, { recursive: true })
  writeFileSync(path.join(dir, 'pr_ref'), prUrl)
}

export function run(args: string[]): number {
  let runId = ''
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--run-id') {
      runId = args[i + 1] ?? ''
    }
  }

  if (isKitSmokeMode()) {
    process.stdout.write(`kit pr-open: smoke mode — ${SMOKE_PR_URL}\n`)
    if (runId) writePrRef(runId, SMOKE_PR_URL)
    return 0
  }

  process.stdout.write('kit pr-open: creating PR via gh pr create\n')

  const result = Bun.spawnSync(['gh', 'pr', 'create', '--fill'], {
    stdout: 'pipe',
    stderr: 'inherit'
  })

  const stdoutStr = new TextDecoder().decode(result.stdout).trim()
  process.stdout.write(`${stdoutStr}\n`)

  if (result.exitCode === 0 && runId) {
    const match = PR_URL_RE.exec(stdoutStr)
    const prUrl = match ? match[0] : stdoutStr.split('\n').pop()?.trim() || ''
    if (prUrl) writePrRef(runId, prUrl)
  }

  return result.exitCode ?? 1
}

if (import.meta.main) process.exit(run(process.argv.slice(2)))
