#!/usr/bin/env bun
import { type ResolveResult, resolveActiveFeatureDir } from '../governance/specs/resolve_active_feature_dir.script.ts'
import { resolveCatalogKey } from '../governance/specs/resolve_catalog_key.script.ts'
import { findActiveRun, listActiveRuns } from '../governance/specs/workflow/workflow_run.script.ts'
/**
 * mise run spec — Spec Kit lint, trace, gate, legacy import (thin dispatch stub).
 */
import { chdirToRepoRoot } from '../support/lib/shared/repo_root.script.ts'
import { spawnInherit } from '../support/lib/shared/spawn_inherit.script.ts'

const SPECS = 'tools/governance/specs'
const WORKFLOW = `${SPECS}/workflow`

export const ALLOWED_WORKFLOW_NAMES = new Set(['orchestrated-handoff', 'resume'])

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

/** Resolve feature dir for `mise run spec gate` (explicit arg or active-feature inference). */
export function resolveSpecGateFeatureDir(explicitDir?: string): ResolveResult {
  return resolveActiveFeatureDir(explicitDir || undefined)
}

function envBool(name: string): boolean {
  return process.env[name] === 'true'
}

function main(): void {
  const root = chdirToRepoRoot()
  const args = process.argv.slice(2)
  const cmd = process.env.usage_cmd ?? args.shift() ?? ''
  if (!cmd) {
    console.error('spec: missing subcommand')
    process.exit(2)
  }

  switch (cmd) {
    case 'lint': {
      const cmdArgs: string[] = []
      if (envBool('usage_all')) cmdArgs.push('--all')
      if (process.env.usage_root) cmdArgs.push('--root', process.env.usage_root)
      if (envBool('usage_strict')) cmdArgs.push('--strict')
      if (process.env.usage_target) cmdArgs.push(process.env.usage_target)
      spawnInherit(['bun', `${SPECS}/lint.script.ts`, ...cmdArgs], root)
      break
    }
    case 'trace': {
      const cmdArgs = [process.env.usage_feature_dir ?? '']
      if (process.env.usage_features) cmdArgs.push('--features', process.env.usage_features)
      if (envBool('usage_strict')) cmdArgs.push('--strict')
      spawnInherit(['bun', `${SPECS}/trace.script.ts`, ...cmdArgs.filter(Boolean)], root)
      break
    }
    case 'gate': {
      const resolved = resolveSpecGateFeatureDir(process.env.usage_feature_dir)
      if (!resolved.ok) {
        console.error(resolved.message)
        process.exit(resolved.exitCode)
      }
      spawnInherit(['bash', `${SPECS}/gate.sh`, resolved.featureDir], root)
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
      console.error('spec resume: use "spec workflow resume" instead')
      process.exit(2)
      break
    case 'worktree-add':
      spawnInherit(['bash', `${SPECS}/worktree-add.sh`, process.env.usage_feature ?? ''], root)
      break
    case 'opencode-check':
      spawnInherit(['bash', `${SPECS}/opencode_check.sh`], root)
      break
    case 'library-manifest': {
      const cmdArgs: string[] = []
      if (envBool('usage_dry_run')) cmdArgs.push('--dry-run')
      if (envBool('usage_verify')) cmdArgs.push('--verify')
      spawnInherit(['bun', `${SPECS}/library_manifest.script.ts`, ...cmdArgs], root)
      break
    }
    case 'workflow': {
      const name = process.env.usage_name ?? ''
      const cmdArgs: string[] = []
      if (name) cmdArgs.push(name)
      if (process.env.usage_feature) cmdArgs.push('--feature', process.env.usage_feature)
      if (envBool('usage_manifest')) cmdArgs.push('--manifest')
      if (envBool('usage_next')) cmdArgs.push('--next')
      if (envBool('usage_lint')) cmdArgs.push('--lint')
      if (envBool('usage_dry_run')) cmdArgs.push('--dry-run')
      if (process.env.usage_answer) cmdArgs.push('--answer', process.env.usage_answer)
      if (process.env.usage_approve) cmdArgs.push('--approve', process.env.usage_approve)
      if (process.env.usage_runId) cmdArgs.push('--run-id', process.env.usage_runId)
      else if (name === 'resume') {
        const active = findActiveRun()
        if (active) {
          cmdArgs.push('--run-id', active)
        } else {
          const candidates = listActiveRuns()
          if (candidates.length === 0) {
            console.error('spec workflow resume: no active runs')
            process.exit(2)
          }
          console.error('spec workflow resume: multiple active runs — pass --run-id')
          for (const r of candidates) console.error(`  ${r}`)
          process.exit(2)
        }
      }
      spawnInherit(['bun', `${SPECS}/workflow_run.script.ts`, ...cmdArgs], root)
      break
    }
    case 'handoff-generate': {
      const cmdArgs: string[] = []
      if (process.env.usage_feature) cmdArgs.push('--feature', process.env.usage_feature)
      if (process.env.usage_focus) cmdArgs.push('--focus', process.env.usage_focus)
      if (process.env.usage_worker) cmdArgs.push('--worker', process.env.usage_worker)
      if (envBool('usage_dispatch')) cmdArgs.push('--dispatch')
      if (envBool('usage_dry_run')) cmdArgs.push('--dry-run')
      spawnInherit(['bun', `${WORKFLOW}/handoff_generate.script.ts`, ...cmdArgs], root)
      break
    }
    case 'security': {
      const cmdArgs: string[] = []
      if (envBool('usage_strict')) cmdArgs.push('--strict')
      if (envBool('usage_changed_only')) cmdArgs.push('--changed-only')
      if (process.env.usage_base) cmdArgs.push('--base', process.env.usage_base)
      if (envBool('usage_json')) cmdArgs.push('--json')
      spawnInherit(['bun', 'tools/governance/security/scan.script.ts', ...cmdArgs], root)
      break
    }
    case 'handoff-scrub': {
      const cmdArgs: string[] = []
      if (process.env.usage_feature) cmdArgs.push('--feature', process.env.usage_feature)
      if (process.env.usage_body) cmdArgs.push(process.env.usage_body)
      spawnInherit(['bun', 'tools/governance/security/handoff_scrub.script.ts', ...cmdArgs], root)
      break
    }
    case 'runs': {
      const action = process.env.usage_action ?? ''
      const cmdArgs: string[] = [action]
      if (process.env.usage_feature) cmdArgs.push('--feature', process.env.usage_feature)
      if (process.env.usage_runId) cmdArgs.push(process.env.usage_runId)
      spawnInherit(['bun', `${WORKFLOW}/runs_cli.script.ts`, ...cmdArgs], root)
      break
    }
    case 'audit': {
      const cmdArgs: string[] = [process.env.usage_feature_dir ?? '']
      if (envBool('usage_strict')) cmdArgs.push('--strict')
      if (envBool('usage_json')) cmdArgs.push('--json')
      if (envBool('usage_raw')) cmdArgs.push('--raw')
      spawnInherit(['bun', `${SPECS}/audit.script.ts`, ...cmdArgs.filter(Boolean)], root)
      break
    }
    case 'ready': {
      const isPhase = envBool('usage_phase')
      const phaseNo = process.env.usage_phase_no ?? ''

      let dir = process.env.usage_feature_dir
      if (!dir) {
        const resolved = resolveActiveFeatureDir()
        if (!resolved.ok) {
          console.error(resolved.message)
          process.exit(resolved.exitCode)
        }
        dir = resolved.featureDir
      }

      if (isPhase) {
        const cmdArgs = [dir]
        if (phaseNo) cmdArgs.push('--phase', phaseNo)
        spawnInherit(['bun', `${SPECS}/phase.script.ts`, ...cmdArgs], root)
        break
      }

      let key = process.env.usage_key ?? ''
      if (!key) {
        const keyResult = resolveCatalogKey(dir)
        key = keyResult.key
        if (!keyResult.ok && keyResult.warning) {
          console.error(keyResult.warning)
        }
      }

      const commands: string[][] = []
      if (key) {
        commands.push(['mise', 'run', 'test', 'tag', key])
      }
      commands.push(['mise', 'run', 'catalog', 'validate', '--raw'])
      commands.push(['hk', 'check', '--profile', 'commit'])
      commands.push(['bash', `${SPECS}/gate.sh`, dir])

      for (const stepCmd of commands) {
        const r = Bun.spawnSync(stepCmd, { cwd: root, stdout: 'inherit', stderr: 'inherit', stdin: 'inherit' })
        if (r.exitCode !== 0) {
          process.exit(r.exitCode ?? 1)
        }
      }
      console.log('spec ready: OK')
      break
    }
    case 'review-handoff': {
      const cmdArgs: string[] = [process.env.usage_action ?? '']
      if (process.env.usage_feature) cmdArgs.push('--feature', process.env.usage_feature)
      if (process.env.usage_handoff) cmdArgs.push('--handoff', process.env.usage_handoff)
      if (process.env.usage_base) cmdArgs.push('--base', process.env.usage_base)
      if (process.env.usage_head) cmdArgs.push('--head', process.env.usage_head)
      if (process.env.usage_focus) cmdArgs.push('--focus', process.env.usage_focus)
      if (envBool('usage_json')) cmdArgs.push('--json')
      spawnInherit(['bun', `${WORKFLOW}/review_handoff.script.ts`, ...cmdArgs.filter(Boolean)], root)
      break
    }
    default:
      console.error(`spec: unknown action ${cmd}`)
      process.exit(2)
  }
}

if (import.meta.main) main()
