#!/usr/bin/env bun
export function run(_args: string[]): number {
  process.stdout.write('kit pr-prep: running hk check --profile pr\n')
  const result = Bun.spawnSync(['hk', 'check', '--profile', 'pr'], { stdout: 'inherit', stderr: 'inherit' })
  return result.exitCode ?? 1
}
if (import.meta.main) process.exit(run(process.argv.slice(2)))
