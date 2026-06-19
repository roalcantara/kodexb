#!/usr/bin/env bun
import { configureOpsLogging } from '../support/lib/cli/ops_logging.script'
import { type RunStep, runStepsAndPrint } from '../support/lib/cli/task_runner.script'
import { usageCmd, usageFlag } from '../support/lib/cli/usage_env.script'

const CMD = usageCmd(process.env, process.argv[2]) || ''
const miscArgs = process.argv.slice(2).filter(a => a !== CMD && a !== process.argv[2])

/**
 * `app gates` — review f18c5638 rule 07: no `--all`. Default (neither
 * `--quality` nor `--policy`) runs BOTH; a single flag runs only that gate;
 * both flags run both.
 */
export function selectGates(quality: boolean, policy: boolean): { quality: boolean; policy: boolean } {
  if (!quality && !policy) return { quality: true, policy: true }
  return { quality, policy }
}

/** Build the gate steps for the selection (pure — unit-testable). */
export function gateSteps(sel: { quality: boolean; policy: boolean }): RunStep[] {
  const steps: RunStep[] = []
  if (sel.quality) {
    steps.push({
      id: 'quality',
      title: 'app quality gate',
      command: ['bash', '.agents/skills/app-quality-gate/scripts/gate.sh']
    })
  }
  if (sel.policy) {
    steps.push({
      id: 'policy',
      title: 'embedded policy gate',
      command: ['bash', '-lc', 'GATE_EMBEDDED_POLICY=1 bash .agents/skills/app-quality-gate/scripts/gate_policy.sh']
    })
  }
  return steps
}

function runGates(): never {
  const sel = selectGates(usageFlag(process.env, 'quality'), usageFlag(process.env, 'policy'))
  const report = runStepsAndPrint(
    { task: 'app-gates', command: 'mise run app gates', steps: gateSteps(sel) },
    { json: usageFlag(process.env, 'json'), raw: usageFlag(process.env, 'raw') }
  )
  process.exit(report.ok ? 0 : 1)
}

function run(): void {
  configureOpsLogging()
  if (CMD === 'gates') runGates()
  const r = Bun.spawnSync(['mise', 'run', '_app_raw', CMD, ...miscArgs], { stdio: ['inherit', 'inherit', 'inherit'] })
  process.exit(r.exitCode ?? 0)
}

if (import.meta.main || (process.argv[1] && !process.argv[1].includes('.spec.'))) run()
