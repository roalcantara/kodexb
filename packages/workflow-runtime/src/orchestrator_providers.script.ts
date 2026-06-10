import type { Profile } from '@kb/workflow-core'
import { checkCiGate } from './ci_gate.script.ts'
import { capturePrRef, persistPrRef, runProvider } from './providers_runner.script.ts'
import type { WorkflowRunWriter } from './workflow_run.script.ts'

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: pre-existing complexity, refactor deferred
export function orchestratedRunProviders(
  profile: Profile,
  allowedPrefixes: string[],
  writer: WorkflowRunWriter,
  featureDir: string,
  runId: string,
  t0: number,
  persistenceRootDir: string,
  dateStr: string
): boolean {
  const prov = profile.providers ?? {}
  if (!prov.pr_open && !prov.ci_status) return true

  let prOpenOk = true

  if (prov.pr_open) {
    const prResult = runProvider(prov.pr_open, allowedPrefixes, writer, 'provider', 'pr-open', featureDir)
    prOpenOk = prResult.ok
    if (prResult.ok && prResult.stdout) {
      const ref = capturePrRef(prResult.stdout)
      if (ref) persistPrRef(persistenceRootDir, dateStr, runId, ref)
    }
    writer.emit({
      type: 'task.completed',
      run_id: runId,
      ts: new Date().toISOString(),
      feature_dir: featureDir,
      command: prov.pr_open,
      role: 'provider',
      stage: 'pr-open',
      exit_code: prResult.exitCode ?? undefined,
      status: prResult.ok ? 'ok' : 'fail',
      duration_ms: prResult.durationMs
    })
  }

  if (prov.ci_status) {
    const maxRetries = profile.default_retry.max_attempts
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const ciResult = runProvider(prov.ci_status, allowedPrefixes, writer, 'provider', 'ci-check', featureDir)
      const gate = checkCiGate(ciResult.exitCode, attempt, maxRetries)
      writer.emit({
        type: 'task.completed',
        run_id: runId,
        ts: new Date().toISOString(),
        feature_dir: featureDir,
        command: prov.ci_status,
        role: 'provider',
        stage: 'ci-check',
        exit_code: ciResult.exitCode ?? undefined,
        status: gate === 'pass' ? 'ok' : 'fail',
        duration_ms: ciResult.durationMs
      })
      if (gate === 'pass') return true
      if (gate === 'escalate') {
        writer.emit({
          type: 'stage.escalated',
          run_id: runId,
          ts: new Date().toISOString(),
          feature_dir: featureDir,
          duration_ms: performance.now() - t0,
          stage: 'ci-check',
          details: { cause: 'ci_retries_exhausted', attempts: attempt + 1 }
        })
        return false
      }
    }
  }
  return prOpenOk
}
