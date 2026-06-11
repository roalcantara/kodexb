#!/usr/bin/env bun
export function run(_args: string[]): number {
  process.stdout.write('kit pr-check: watching CI checks via gh pr checks --watch\n')
  const result = Bun.spawnSync(['gh', 'pr', 'checks', '--watch', '--required'], {
    stdout: 'inherit',
    stderr: 'inherit'
  })
  return result.exitCode ?? 1
}
if (import.meta.main) process.exit(run(process.argv.slice(2)))
