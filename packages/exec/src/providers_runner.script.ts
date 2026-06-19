import { readSharedMemory, writeSharedMemory } from './memory.script'
import { invokeWithTelemetry } from './workflow_invoker.script'
import type { WorkflowRunWriter } from './workflow_run.script'

export type ProviderRole = 'evidence' | 'trigger.pre' | 'trigger.post' | 'provider' | 'teardown' | 'retrospective'

export type ProviderResult = {
  ok: boolean
  stdout: string
  exitCode: number | null
  durationMs: number
}

export function runProvider(
  command: string,
  allowedPrefixes: string[],
  writer: WorkflowRunWriter,
  role: ProviderRole,
  stage: string,
  featureDir: string
): ProviderResult {
  const result = invokeWithTelemetry({ command, cwd: process.cwd() }, allowedPrefixes, role, stage, {
    writer,
    featureDir
  })
  return {
    ok: result.exitCode === 0 && !result.rejected,
    stdout: result.stdout,
    exitCode: result.exitCode,
    durationMs: result.durationMs
  }
}

const RE_GITHUB_PR = /https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/pull\/\d+/

export function capturePrRef(stdout: string): string {
  const match = stdout.match(RE_GITHUB_PR)
  return match?.[0] ?? ''
}

export function persistPrRef(runDir: string, dateStr: string, runId: string, prRef: string): void {
  const shared = readSharedMemory(runDir, dateStr, runId)
  shared.pr_ref = prRef
  shared.pr_created_at = new Date().toISOString()
  writeSharedMemory(runDir, dateStr, runId, shared)
}
