/**
 * Step orchestration for `mise run spec gate`, `spec ready`, and `spec closeout`.
 */

import { type RunStep, runStepsAndPrint } from '../../support/lib/cli/task_runner.script'
import { runInherit } from '../../support/lib/shared/spawn_inherit.script'
import { applyPhaseCommit, applyRemaining } from './commit_plan_apply.script'
import { runHandoffEvidence } from './handoff_evidence.script'
import { resolveCatalogKey } from './resolve_catalog_key.script'
import type { SpecPlan } from './spec_plan.script'
import { SPECS_ROOT } from './spec_plan_builders.script'

const GATE_SH = `${SPECS_ROOT}/gate.sh`

export type SpecReadyOpts = {
  catalogKey?: string
  catalogWarning?: string
  commit?: boolean
  phaseId?: string
  commitMessage?: string
  dryRun?: boolean
}

export type SpecCloseoutOpts = SpecReadyOpts & {
  includeOperatorSmoke?: boolean
  evidenceDryRun?: boolean
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

function commitFlushStep(featureDir: string, root: string, opts: SpecReadyOpts): RunStep {
  return {
    id: 'commit-flush',
    title: 'commit plan flush remaining',
    run: () =>
      applyRemaining({
        root,
        featureDir,
        messageOverride: opts.commitMessage,
        dryRun: opts.dryRun,
        strictCoverage: true
      })
  }
}

function commitPhaseStep(featureDir: string, root: string, opts: SpecReadyOpts): RunStep {
  const phaseId = opts.phaseId ?? ''
  return {
    id: 'commit-chunk',
    title: `commit plan chunk ${phaseId}`,
    run: () =>
      applyPhaseCommit({
        root,
        featureDir,
        phaseId,
        messageOverride: opts.commitMessage,
        dryRun: opts.dryRun
      })
  }
}

export function specReadySteps(featureDir: string, root: string, opts: SpecReadyOpts = {}): RunStep[] {
  if (opts.catalogWarning) console.error(opts.catalogWarning)
  const key = opts.catalogKey
  const steps: RunStep[] = []

  if (opts.commit && opts.phaseId) {
    steps.push(commitPhaseStep(featureDir, root, opts))
    return steps
  }

  if (opts.commit) {
    steps.push(commitFlushStep(featureDir, root, opts))
  }

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
  const readyOpts: SpecReadyOpts = {
    catalogKey: opts.catalogKey,
    catalogWarning: opts.catalogWarning,
    commit: opts.commit,
    phaseId: opts.phaseId,
    commitMessage: opts.commitMessage,
    dryRun: opts.dryRun
  }

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
    }
  ]

  if (opts.commit) {
    steps.push(commitFlushStep(featureDir, root, readyOpts))
  }

  steps.push(...specReadySteps(featureDir, root, { ...readyOpts, commit: false }))

  return steps
}

function readyOptsFromEnv(base: SpecReadyOpts): SpecReadyOpts {
  const commitFlag = process.env.usage_commit === 'true'
  const commitMessage =
    process.env.usage_commit_message?.trim() ||
    (process.env.usage_commit?.trim() && process.env.usage_commit !== 'true'
      ? process.env.usage_commit.trim()
      : undefined) ||
    process.env.usage_message?.trim() ||
    undefined
  const hasCommit = commitFlag || Boolean(commitMessage)
  const phaseId = process.env.usage_phase?.trim() || undefined

  return {
    ...base,
    commit: hasCommit || base.commit,
    phaseId: phaseId ?? base.phaseId,
    commitMessage: commitMessage ?? base.commitMessage,
    dryRun: process.env.usage_dry_run === 'true' || base.dryRun
  }
}

export function buildSpecRunnerSteps(plan: Extract<SpecPlan, { kind: 'runner' }>, root: string): RunStep[] {
  const dir = plan.featureDir
  if (plan.task === 'spec-gate') return specGateSteps(dir, root)
  const keyResult = resolveCatalogKey(dir)
  const key = process.env.usage_key || keyResult.key
  const baseReady: SpecReadyOpts = {
    catalogKey: key || undefined,
    catalogWarning: !keyResult.ok && keyResult.warning ? keyResult.warning : undefined
  }
  const readyOpts = readyOptsFromEnv(baseReady)

  if (plan.task === 'spec-closeout') {
    return specCloseoutSteps(dir, root, {
      ...readyOpts,
      includeOperatorSmoke: process.env.usage_include_smoke === 'true',
      evidenceDryRun: process.env.usage_dry_run === 'true'
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
