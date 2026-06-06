#!/usr/bin/env bun
/**
 * mise run spec — Spec Kit lint, trace, gate, legacy import (thin dispatch stub).
 */
import { chdirToRepoRoot } from '../support/lib/shared/repo_root.script.ts'
import { spawnInherit } from '../support/lib/shared/spawn_inherit.script.ts'

const SPECS = 'tools/governance/specs'

function envBool(name: string): boolean {
  return process.env[name] === 'true'
}

function main(): void {
  const root = chdirToRepoRoot()
  const cmd = process.env.usage_cmd ?? ''
  if (!cmd) {
    console.error('spec: missing subcommand')
    process.exit(2)
  }

  switch (cmd) {
    case 'lint': {
      const args: string[] = []
      if (envBool('usage_all')) args.push('--all')
      if (process.env.usage_root) args.push('--root', process.env.usage_root)
      if (envBool('usage_strict')) args.push('--strict')
      if (process.env.usage_target) args.push(process.env.usage_target)
      spawnInherit(['bun', `${SPECS}/lint.script.ts`, ...args], root)
      break
    }
    case 'trace': {
      const args = [process.env.usage_feature_dir ?? '']
      if (process.env.usage_features) args.push('--features', process.env.usage_features)
      if (envBool('usage_strict')) args.push('--strict')
      spawnInherit(['bun', `${SPECS}/trace.script.ts`, ...args.filter(Boolean)], root)
      break
    }
    case 'gate': {
      const dir = process.env.usage_feature_dir ?? 'assets/specs/001-sync-frecency-persistence'
      spawnInherit(['bash', `${SPECS}/gate.sh`, dir], root)
      break
    }
    case 'import-legacy': {
      const feat = process.env.usage_feature ?? '001-sync-frecency-persistence'
      spawnInherit(['bun', `${SPECS}/import_legacy.script.ts`, '--feature', feat], root)
      break
    }
    case 'feature-init':
      spawnInherit(
        [
          'bun',
          `${SPECS}/feature_init.script.ts`,
          '--id',
          process.env.usage_id ?? '',
          '--slug',
          process.env.usage_slug ?? ''
        ],
        root
      )
      break
    case 'resume':
      spawnInherit(['specify', 'workflow', 'resume'], root)
      break
    case 'worktree-add':
      spawnInherit(['bash', `${SPECS}/worktree-add.sh`, process.env.usage_feature ?? ''], root)
      break
    case 'opencode-check':
      spawnInherit(['bash', `${SPECS}/opencode_check.sh`], root)
      break
    case 'library-manifest': {
      const args: string[] = []
      if (envBool('usage_dry_run')) args.push('--dry-run')
      if (envBool('usage_apply')) args.push('--apply')
      if (envBool('usage_verify')) args.push('--verify')
      spawnInherit(['bun', `${SPECS}/library_manifest.script.ts`, ...args], root)
      break
    }
    default:
      console.error(`spec: unknown action ${cmd}`)
      process.exit(2)
  }
}

main()
