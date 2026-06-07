#!/usr/bin/env bun
/**
 * mise run spec — Spec Kit lint, trace, gate, legacy import (thin dispatch stub).
 */
import { chdirToRepoRoot } from '../support/lib/shared/repo_root.script.ts'
import { spawnInherit } from '../support/lib/shared/spawn_inherit.script.ts'

const SPECS = 'tools/governance/specs'
const WORKFLOW = `${SPECS}/workflow`

export const ALLOWED_WORKFLOW_NAMES = new Set(['orchestrated-handoff'])

/**
 * Validate the positional workflow name passed to `mise run spec workflow <name>`.
 * Returns an error message string when the name is unknown, or `null` when the
 * name is acceptable. Empty string is accepted because usage clauses always pass
 * the argument (mise expands `<name>` even when the operator omits it); the
 * caller decides whether to fall back to a default.
 */
export function validateWorkflowName(name: string): string | null {
  if (name === '') return null
  if (ALLOWED_WORKFLOW_NAMES.has(name)) return null
  return `spec workflow: unknown workflow "${name}". Allowed: ${[...ALLOWED_WORKFLOW_NAMES].join(', ')}`
}

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
      if (envBool('usage_verify')) args.push('--verify')
      spawnInherit(['bun', `${SPECS}/library_manifest.script.ts`, ...args], root)
      break
    }
    case 'workflow': {
      const name = process.env.usage_name ?? ''
      const validationError = validateWorkflowName(name)
      if (validationError) {
        console.error(validationError)
        process.exit(2)
      }
      const args: string[] = []
      if (name) args.push(name)
      if (process.env.usage_feature) args.push('--feature', process.env.usage_feature)
      if (envBool('usage_manifest')) args.push('--manifest')
      if (envBool('usage_next')) args.push('--next')
      if (envBool('usage_lint')) args.push('--lint')
      spawnInherit(['bun', `${WORKFLOW}/orchestrated_handoff.script.ts`, ...args], root)
      break
    }
    case 'handoff-generate': {
      const args: string[] = []
      if (process.env.usage_feature) args.push('--feature', process.env.usage_feature)
      if (process.env.usage_focus) args.push('--focus', process.env.usage_focus)
      if (process.env.usage_worker) args.push('--worker', process.env.usage_worker)
      if (envBool('usage_dispatch')) args.push('--dispatch')
      if (envBool('usage_dry_run')) args.push('--dry-run')
      spawnInherit(['bun', `${WORKFLOW}/handoff_generate.script.ts`, ...args], root)
      break
    }
    case 'runs': {
      const action = process.env.usage_action ?? ''
      const args: string[] = [action]
      if (process.env.usage_feature) args.push('--feature', process.env.usage_feature)
      if (process.env.usage_runId) args.push(process.env.usage_runId)
      spawnInherit(['bun', `${WORKFLOW}/runs_cli.script.ts`, ...args], root)
      break
    }
    case 'review-handoff': {
      const args: string[] = [process.env.usage_action ?? '']
      if (process.env.usage_feature) args.push('--feature', process.env.usage_feature)
      if (process.env.usage_handoff) args.push('--handoff', process.env.usage_handoff)
      if (process.env.usage_base) args.push('--base', process.env.usage_base)
      if (process.env.usage_head) args.push('--head', process.env.usage_head)
      if (process.env.usage_focus) args.push('--focus', process.env.usage_focus)
      if (envBool('usage_json')) args.push('--json')
      spawnInherit(['bun', `${WORKFLOW}/review_handoff.script.ts`, ...args.filter(Boolean)], root)
      break
    }
    default:
      console.error(`spec: unknown action ${cmd}`)
      process.exit(2)
  }
}

if (import.meta.main) main()
