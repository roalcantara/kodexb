import {
  type AsyncCommandHandle,
  type CommandDescriptor,
  type CommandResult,
  runCommandAsync
} from './command_invoker.script.ts'
import type { InvocationTelemetry } from './workflow_invoker.script.ts'

export type TeardownHandle = { command: string; abort: () => void }

export function spawnTeardownFireAndForget(
  descriptor: CommandDescriptor,
  allowedPrefixes: string[],
  telemetry: InvocationTelemetry,
  stage: string,
  _timeoutMs: number,
  onSettled: (result: CommandResult) => void
): TeardownHandle {
  telemetry.writer.emit({
    type: 'task.invoked',
    run_id: telemetry.writer.runId,
    ts: new Date().toISOString(),
    feature_dir: telemetry.featureDir,
    duration_ms: 0,
    command: descriptor.command,
    role: 'teardown',
    stage
  })

  let aborted = false
  const handle: AsyncCommandHandle = runCommandAsync(descriptor, allowedPrefixes)

  handle.promise
    .then(result => {
      telemetry.writer.emit({
        type: 'task.completed',
        run_id: telemetry.writer.runId,
        ts: new Date().toISOString(),
        feature_dir: telemetry.featureDir,
        command: descriptor.command,
        role: 'teardown',
        stage,
        exit_code: result.exitCode,
        status: aborted ? 'cancelled' : result.rejected ? 'fail' : result.exitCode === 0 ? 'ok' : 'fail',
        duration_ms: result.durationMs,
        cancellation_reason: aborted ? 'shutdown' : undefined
      })
      onSettled(result)
    })
    .catch(() => {})

  return {
    command: descriptor.command,
    abort: () => {
      aborted = true
      handle.kill()
    }
  }
}
