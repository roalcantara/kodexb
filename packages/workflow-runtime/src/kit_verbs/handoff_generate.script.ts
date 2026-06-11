#!/usr/bin/env bun
export function run(_args: string[]): number {
  process.stdout.write('kit handoff-generate: dispatching /speckit-handoff-generate\n')
  return 0
}
if (import.meta.main) process.exit(run(process.argv.slice(2)))
