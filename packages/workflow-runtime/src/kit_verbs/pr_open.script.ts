#!/usr/bin/env bun
export function run(_args: string[]): number {
  process.stdout.write('kit pr-open: creating PR via gh pr create\n')
  const result = Bun.spawnSync(['gh', 'pr', 'create', '--fill'], { stdout: 'inherit', stderr: 'inherit' })
  return result.exitCode ?? 1
}
if (import.meta.main) process.exit(run(process.argv.slice(2)))
