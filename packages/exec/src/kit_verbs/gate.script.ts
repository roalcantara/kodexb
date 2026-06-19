#!/usr/bin/env bun
import { isKitSmokeMode } from '../kit_smoke.script'

export function run(_args: string[]): number {
  if (isKitSmokeMode()) {
    process.stdout.write('kit gate: smoke mode — skipping spec gate + gate.sh\n')
    return 0
  }
  process.stdout.write('kit gate: running mise run spec gate + bash gate.sh\n')

  const specGateResult = Bun.spawnSync(['mise', 'run', 'spec', 'gate', process.env.usage_feature ?? ''], {
    stdout: 'inherit',
    stderr: 'inherit'
  })
  if (specGateResult.exitCode !== 0) return specGateResult.exitCode ?? 1

  const qualityResult = Bun.spawnSync(['bash', '.agents/skills/app-quality-gate/scripts/gate.sh'], {
    stdout: 'inherit',
    stderr: 'inherit'
  })
  return qualityResult.exitCode ?? 1
}
if (import.meta.main) process.exit(run(process.argv.slice(2)))
