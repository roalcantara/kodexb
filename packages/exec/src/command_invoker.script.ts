import { spawnSync } from 'node:child_process'
import { validateCommandPrefix } from '@kb/flow'

export type CommandDescriptor = {
  command: string
  cwd?: string
  timeout_ms?: number
}

const ALLOWED_ENV_VARS = ['PATH', 'HOME', 'TMPDIR', 'USER', 'SHELL', 'TERM', 'NODE_ENV']

function safeEnv(overrides?: Record<string, string | undefined>): Record<string, string> {
  const result: Record<string, string> = {}
  for (const key of ALLOWED_ENV_VARS) {
    const value = overrides?.[key] ?? process.env[key]
    if (value !== undefined) result[key] = value
  }
  return result
}

export type DiagnosticCode =
  | 'COMMAND_PREFIX_REJECTED'
  | 'COMMAND_TARGET_MISSING'
  | 'COMMAND_EXECUTION_ERROR'
  | 'SANDBOX_VIOLATION'

export type CommandResult = {
  exitCode: number
  stdout: string
  stderr: string
  durationMs: number
  rejected?: boolean
  rejectionReason?: string
  diagnostic?: { code: DiagnosticCode }
}

function validatePrefix(command: string, allowedPrefixes: string[]): CommandResult | null {
  const prefixCheck = validateCommandPrefix(command, allowedPrefixes)
  if (!prefixCheck.matched) {
    return {
      exitCode: -1,
      stdout: '',
      stderr: '',
      durationMs: 0,
      rejected: true,
      rejectionReason: prefixCheck.diagnostic ?? 'command prefix not allowed',
      diagnostic: { code: 'COMMAND_PREFIX_REJECTED' }
    }
  }
  return null
}

export function runCommand(descriptor: CommandDescriptor, allowedPrefixes: string[]): CommandResult {
  const rejected = validatePrefix(descriptor.command, allowedPrefixes)
  if (rejected) return rejected

  const t0 = performance.now()

  try {
    const result = spawnSync(descriptor.command, {
      shell: true,
      cwd: descriptor.cwd,
      timeout: descriptor.timeout_ms,
      env: safeEnv({ cwd: descriptor.cwd })
    })

    const durationMs = performance.now() - t0

    return {
      exitCode: result.status ?? 1,
      stdout: result.stdout?.toString() ?? '',
      stderr: result.stderr?.toString() ?? '',
      durationMs
    }
  } catch (err) {
    const durationMs = performance.now() - t0
    const nodeErr = err as NodeJS.ErrnoException
    return {
      exitCode: 1,
      stdout: '',
      stderr: String(err),
      durationMs,
      rejected: true,
      rejectionReason: String(err),
      diagnostic: { code: nodeErr.code === 'ENOENT' ? 'COMMAND_TARGET_MISSING' : 'COMMAND_EXECUTION_ERROR' }
    }
  }
}

export type AsyncCommandHandle = {
  promise: Promise<CommandResult>
  kill: () => void
}

export function runCommandAsync(descriptor: CommandDescriptor, allowedPrefixes: string[]): AsyncCommandHandle {
  const rejected = validatePrefix(descriptor.command, allowedPrefixes)
  if (rejected)
    return {
      promise: Promise.resolve(rejected),
      kill: () => {
        /* intentional noop */
      }
    }

  const t0 = performance.now()
  const cmd = descriptor.command
  const proc = Bun.spawn({
    cmd: ['sh', '-c', cmd],
    cwd: descriptor.cwd ?? process.cwd(),
    env: safeEnv({ cwd: descriptor.cwd }),
    stdout: 'pipe',
    stderr: 'pipe'
  })

  let settled = false
  let killer: ReturnType<typeof setTimeout> | undefined

  const doKill = () => {
    if (settled) return
    settled = true
    clearTimeout(killer)
    proc.kill()
  }

  if (descriptor.timeout_ms) {
    killer = setTimeout(doKill, descriptor.timeout_ms)
  }

  const promise = (async (): Promise<CommandResult> => {
    const exitCode = await proc.exited
    clearTimeout(killer)

    if (settled) {
      return {
        exitCode: -1,
        stdout: '',
        stderr: descriptor.timeout_ms ? `killed after ${descriptor.timeout_ms}ms` : 'killed by caller',
        durationMs: performance.now() - t0,
        rejected: true
      }
    }
    settled = true

    const stdout = await new Response(proc.stdout).text()
    const stderr = await new Response(proc.stderr).text()
    const durationMs = performance.now() - t0

    return { exitCode, stdout, stderr, durationMs }
  })()

  return { promise, kill: doKill }
}
