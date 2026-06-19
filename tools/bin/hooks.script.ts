#!/usr/bin/env bun
/**
 * mise run hooks — tests and checks for Cursor agent hooks (.cursor/hooks/).
 */
import { chdirToRepoRoot } from '../support/lib/shared/repo_root.script.ts'
import { spawnInherit } from '../support/lib/shared/spawn_inherit.script.ts'

function main(): void {
  const root = chdirToRepoRoot()
  const action = process.env.usage_cmd ?? ''

  switch (action as string) {
    case 'governance-audit':
      spawnInherit(['bun', 'test', '--config', '/dev/null', '.cursor/hooks/governance_audit.core.spec.ts'], root)
      break
    default:
      console.error(`hooks: unknown action '${action}' (expected: governance-audit)`)
      process.exit(2)
  }
}

main()
