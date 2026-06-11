#!/usr/bin/env bun
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { featureDirFromArgv, isKitSmokeMode } from '../kit_smoke.script.ts'

export function run(args: string[]): number {
  process.stdout.write('kit implement: dispatching /speckit-implement\n')
  if (isKitSmokeMode()) {
    const featureDir = featureDirFromArgv(args)
    if (featureDir) {
      const marker = path.join(featureDir, 'checklists/implement-done.md')
      mkdirSync(path.dirname(marker), { recursive: true })
      writeFileSync(marker, '# Implement done\n\nSmoke harness marker.\n')
    }
  }
  return 0
}
if (import.meta.main) process.exit(run(process.argv.slice(2)))
