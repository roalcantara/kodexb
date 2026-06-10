import { spawnSync } from 'node:child_process'
import { validateCommandPrefix } from './execution_policy.script.ts'

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

export function runCommand(descriptor: CommandDescriptor, allowedPrefixes: string[]): CommandResult {
  const prefixCheck = validateCommandPrefix(descriptor.command, allowedPrefixes)

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
