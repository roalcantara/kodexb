#!/usr/bin/env bun
import { isKitSmokeMode } from '../kit_smoke.script.ts'

export function run(_args: string[]): number {
  if (isKitSmokeMode()) {
    process.stdout.write('kit pr-check: smoke mode — skipping gh pr checks\n')
    return 0
  }
  process.stdout.write('kit pr-check: watching CI checks via gh pr checks --watch\n')
  const result = Bun.spawnSync(['gh', 'pr', 'checks', '--watch', '--required'], {
    stdout: 'inherit',
    stderr: 'inherit'
  })
  return result.exitCode ?? 1
}
if (import.meta.main) process.exit(run(process.argv.slice(2)))
