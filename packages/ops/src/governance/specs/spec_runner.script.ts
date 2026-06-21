/**
 * Step orchestration for `mise run spec gate`, `spec ready`, and `spec closeout`.
 */

import { type RunStep, runStepsAndPrint } from '../../support/lib/cli/task_runner.script'
import { runInherit } from '../../support/lib/shared/spawn_inherit.script'
import { runCloseoutCommit } from './closeout_commit.script'
import { runHandoffEvidence } from './handoff_evidence.script'
import { resolveCatalogKey } from './resolve_catalog_key.script'
import type { SpecPlan } from './spec_plan.script'
import { SPECS_ROOT } from './spec_plan_builders.script'

const GATE_SH = `${SPECS_ROOT}/gate.sh`

export type SpecReadyOpts = {
  catalogKey?: string
  catalogWarning?: string
}

export type SpecCloseoutOpts = SpecReadyOpts & {
  includeOperatorSmoke?: boolean
  evidenceDryRun?: boolean
  commit?: boolean
  commitMessage?: string
}

export function specGateSteps(featureDir: string, root: string): RunStep[] {
  return [
    {
      id: 'gate',
      title: `spec gate ${featureDir}`,
      run: () => runInherit(['bash', GATE_SH, featureDir], root)
    }
  ]
}

export function specReadySteps(featureDir: string, root: string, opts: SpecReadyOpts = {}): RunStep[] {
  if (opts.catalogWarning) console.error(opts.catalogWarning)
  const key = opts.catalogKey
  const steps: RunStep[] = []
  if (key) {
    steps.push({
      id: 'tag',
      title: `tag test ${key}`,
      run: () => runInherit(['mise', 'run', 'test', 'tag', key], root)
    })
  }
  steps.push(
    {
      id: 'catalog',
      title: 'catalog validate',
      run: () => runInherit(['mise', 'run', 'catalog', 'validate', '--raw'], root)
    },
    {
      id: 'hk',
      title: 'hk check profile commit',
      run: () => runInherit(['hk', 'check', '--profile', 'commit'], root)
    },
    {
      id: 'gate',
      title: `spec gate ${featureDir}`,
      run: () => runInherit(['bash', GATE_SH, featureDir], root)
    }
  )
  if (key) {
    steps.push({
      id: 'promote',
      title: `catalog promote ${key}`,
      run: () => runInherit(['mise', 'run', 'catalog', 'promote', key], root)
    })
  }
  return steps
}

export function specCloseoutSteps(featureDir: string, root: string, opts: SpecCloseoutOpts = {}): RunStep[] {
  const steps: RunStep[] = [
    {
      id: 'audit',
      title: `spec audit --strict ${featureDir}`,
      run: () => runInherit(['bun', `${SPECS_ROOT}/audit.script.ts`, featureDir, '--strict'], root)
    },
    {
      id: 'evidence',
      title: 'handoff evidence commands',
      run: () => {
        const result = runHandoffEvidence({
          featureDir,
          root,
          includeOperatorSmoke: opts.includeOperatorSmoke,
          dryRun: opts.evidenceDryRun
        })
        return result.ok ? 0 : 1
      }
    },
    ...specReadySteps(featureDir, root, opts)
  ]

  if (opts.commit) {
    steps.push({
      id: 'commit',
      title: 'git commit closeout',
      run: () =>
        runCloseoutCommit({
          root,
          featureDir,
          message: opts.commitMessage
        })
    })
  }

  return steps
}

export function buildSpecRunnerSteps(plan: Extract<SpecPlan, { kind: 'runner' }>, root: string): RunStep[] {
  const dir = plan.featureDir
  if (plan.task === 'spec-gate') return specGateSteps(dir, root)
  const keyResult = resolveCatalogKey(dir)
  const key = process.env.usage_key || keyResult.key
  const readyOpts: SpecReadyOpts = {
    catalogKey: key || undefined,
    catalogWarning: !keyResult.ok && keyResult.warning ? keyResult.warning : undefined
  }
  if (plan.task === 'spec-closeout') {
    return specCloseoutSteps(dir, root, {
      ...readyOpts,
      includeOperatorSmoke: process.env.usage_include_smoke === 'true',
      evidenceDryRun: process.env.usage_dry_run === 'true',
      commit: process.env.usage_commit === 'true',
      commitMessage: process.env.usage_message
    })
  }
  return specReadySteps(dir, root, readyOpts)
}

export function runSpecRunner(plan: Extract<SpecPlan, { kind: 'runner' }>, root: string): never {
  const dir = plan.featureDir
  const steps = buildSpecRunnerSteps(plan, root)
  const report = runStepsAndPrint(
    { task: plan.task, command: `mise run ${plan.task.replace('spec-', 'spec ')} ${dir}`, steps },
    { json: plan.json, raw: plan.raw }
  )
  process.exit(report.ok ? 0 : 1)
}
