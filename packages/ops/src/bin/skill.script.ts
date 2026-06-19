#!/usr/bin/env bun
/**
 * mise run skill — agent skill registry CLI (thin dispatch stub).
 */
import { chdirToRepoRoot } from '../support/lib/shared/repo_root.script'

async function run(): Promise<void> {
  const cmd = process.env.usage_cmd ?? process.argv[2] ?? ''
  const args = process.argv.slice(2).filter(a => a !== cmd && a !== 'skill')

  chdirToRepoRoot()
  const proc = Bun.spawn(
    ['bun', 'packages/ops/src/governance/registries/skill/skill_registry.script.ts', cmd, ...args],
    {
      stdin: 'inherit',
      stdout: 'inherit',
      stderr: 'inherit'
    }
  )
  process.exit(await proc.exited)
}

if (import.meta.main || (process.argv[1] && !process.argv[1].includes('.spec.'))) {
  run().catch(err => {
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
  })
}
