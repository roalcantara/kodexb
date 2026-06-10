import type { Static } from '@sinclair/typebox'
import { type CommandDescriptor, type CommandResult, runCommand } from './command_invoker.script.ts'
import { checkSandbox } from './sandbox.script.ts'
import type { SandboxDescriptor } from './schemas/profile.schema.ts'
import type { WorkflowEvent, WorkflowRunWriter } from './workflow_run.script.ts'

export type InvocationTelemetry = {
  writer: WorkflowRunWriter
  featureDir: string
}

export function invokeWithTelemetry(
  descriptor: CommandDescriptor,
  allowedPrefixes: string[],
  role: 'evidence' | 'trigger.pre' | 'trigger.post' | 'provider' | 'teardown' | 'retrospective',
  stage: string | undefined,
  telemetry?: InvocationTelemetry,
  sandbox?: Static<typeof SandboxDescriptor>
): CommandResult {
  if (sandbox) {
    const violation = checkSandbox(sandbox, { command: descriptor.command })
    if (violation) {
      const blockedResult: CommandResult = {
        exitCode: -1,
        stdout: '',
        stderr: `SANDBOX_VIOLATION: ${violation.dimension} — ${violation.detail ?? violation.attempted}`,
        durationMs: 0,
        rejected: true,
        rejectionReason: `SANDBOX_VIOLATION: ${violation.dimension}`,
        diagnostic: { code: 'SANDBOX_VIOLATION' as const }
      }
      if (telemetry) {
        telemetry.writer.emit({
          type: 'sandbox.violation',
          run_id: telemetry.writer.runId,
          ts: new Date().toISOString(),
          feature_dir: telemetry.featureDir,
          duration_ms: 0,
          stage: stage ?? 'unknown',
          descriptor_field: violation.dimension as 'tool_allowlist' | 'fs_scope' | 'secret_handling' | 'network',
          attempted: violation.attempted
        })
      }
      return blockedResult
    }
  }

  if (telemetry) {
    const invokedEvent: WorkflowEvent = {
      type: 'task.invoked',
      run_id: telemetry.writer.runId,
      ts: new Date().toISOString(),
      feature_dir: telemetry.featureDir,
      duration_ms: 0,
      command: descriptor.command,
      role,
      stage
    }
    telemetry.writer.emit(invokedEvent)
  }

  const result = runCommand(descriptor, allowedPrefixes)

  if (telemetry) {
    const completedEvent: WorkflowEvent = {
      type: 'task.completed',
      run_id: telemetry.writer.runId,
      ts: new Date().toISOString(),
      feature_dir: telemetry.featureDir,
      command: descriptor.command,
      role,
      stage,
      exit_code: result.exitCode,
      status: result.rejected ? 'fail' : result.exitCode === 0 ? 'ok' : 'fail',
      duration_ms: result.durationMs
    }
    telemetry.writer.emit(completedEvent)
  }

  return result
}
