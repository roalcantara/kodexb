#!/usr/bin/env bun
/**
 * mise run audit — documentation hygiene diagnostics (non-gating).
 */
import { chdirToRepoRoot } from '../support/lib/shared/repo_root.script'
import { spawnInherit } from '../support/lib/shared/spawn_inherit.script'

function main(): void {
  const root = chdirToRepoRoot()
  const cmd = process.env.usage_cmd ?? ''
  switch (cmd as string) {
    case 'rogue-refs':
      spawnInherit(['bun', 'packages/ops/src/governance/policies/rogue_refs.script.ts'], root)
      break
    default:
      console.error(`audit: unknown subcommand '${cmd}' (expected rogue-refs)`)
      process.exit(2)
  }
}

main()
