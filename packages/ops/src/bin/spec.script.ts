#!/usr/bin/env bun
import { findActiveRun } from '@kb/exec'
import { planSpec } from '../governance/specs/spec_plan.script'
import { runSpecRunner } from '../governance/specs/spec_runner.script'
/**
 * mise run spec — Spec Kit lint, trace, gate, legacy import (thin dispatch stub).
 */
import { chdirToRepoRoot } from '../support/lib/shared/repo_root.script'
import { spawnInherit } from '../support/lib/shared/spawn_inherit.script'

export {
  ALLOWED_WORKFLOW_NAMES,
  planSpec,
  resolveSpecGateFeatureDir,
  type SpecPlan,
  validateWorkflowName
} from '../governance/specs/spec_plan.script'
export { rawJsonConflict } from '../support/lib/cli/usage_env.script'

function main(): void {
  const root = chdirToRepoRoot()
  const args = process.argv.slice(2)
  const rawCmd = (process.env.usage_cmd ?? '').trim()
  if (rawCmd) args.unshift(...rawCmd.split(' '))
  const cmd = args.shift() ?? ''
  if (!cmd) {
    console.error('spec: missing subcommand')
    process.exit(2)
  }

  const plan = planSpec(cmd, args, process.env, { activeRun: () => findActiveRun() })
  if (plan.kind === 'error') {
    console.error(plan.message)
    process.exit(plan.exitCode)
  }
  if (plan.kind === 'runner') runSpecRunner(plan, root)
  if (plan.kind === 'spawn' && plan.env) {
    const r = Bun.spawnSync(plan.argv, { cwd: root, stdout: 'inherit', stderr: 'inherit', env: plan.env })
    process.exit(r.exitCode ?? 1)
  }
  spawnInherit(plan.argv, root)
}

if (import.meta.main || (process.argv[1] && !process.argv[1].includes('.spec.'))) {
  main()
}
