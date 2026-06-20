/**
 * Step orchestration for `mise run spec gate` and `mise run spec ready`.
 */

import { type RunStep, runStepsAndPrint } from '../../support/lib/cli/task_runner.script'
import { runInherit } from '../../support/lib/shared/spawn_inherit.script'
import { resolveCatalogKey } from './resolve_catalog_key.script'
import type { SpecPlan } from './spec_plan.script'
import { SPECS_ROOT } from './spec_plan_builders.script'

const GATE_SH = `${SPECS_ROOT}/gate.sh`

export type SpecReadyOpts = {
  catalogKey?: string
  catalogWarning?: string
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
  return steps
}

export function buildSpecRunnerSteps(plan: Extract<SpecPlan, { kind: 'runner' }>, root: string): RunStep[] {
  const dir = plan.featureDir
  if (plan.task === 'spec-gate') return specGateSteps(dir, root)
  const keyResult = resolveCatalogKey(dir)
  const key = process.env.usage_key || keyResult.key
  return specReadySteps(dir, root, {
    catalogKey: key || undefined,
    catalogWarning: !keyResult.ok && keyResult.warning ? keyResult.warning : undefined
  })
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
