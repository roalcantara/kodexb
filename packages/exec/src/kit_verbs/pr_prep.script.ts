#!/usr/bin/env bun
import { isKitSmokeMode } from '../kit_smoke.script'

export function run(_args: string[]): number {
  if (isKitSmokeMode()) {
    process.stdout.write('kit pr-prep: smoke mode — skipping hk check --profile pr\n')
    return 0
  }
  process.stdout.write('kit pr-prep: running hk check --profile pr\n')
  const result = Bun.spawnSync(['hk', 'check', '--profile', 'pr'], { stdout: 'inherit', stderr: 'inherit' })
  return result.exitCode ?? 1
}
if (import.meta.main) process.exit(run(process.argv.slice(2)))
