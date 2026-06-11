#!/usr/bin/env bun
export function run(_args: string[]): number {
  process.stdout.write('kit checklist: dispatching /speckit-checklist\n')
  return 0
}
if (import.meta.main) process.exit(run(process.argv.slice(2)))
