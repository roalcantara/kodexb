import { stripUsageEnv } from '../cli/usage_env.script'

type Env = Record<string, string | undefined>

function mergeEnv(base: Env, overlay?: Env): Env {
  const env = { ...base }
  if (overlay) {
    for (const [k, v] of Object.entries(overlay)) {
      if (v !== undefined) env[k] = v
    }
  }
  return env
}

export function runInherit(cmd: string[], cwd: string, envOverlay?: Env): number {
  const env = mergeEnv(stripUsageEnv(process.env), envOverlay)
  const r = Bun.spawnSync(cmd, { cwd, env, stdout: 'inherit', stderr: 'inherit', stdin: 'inherit' })
  return r.exitCode ?? (r.success ? 0 : 1)
}

export function spawnInherit(cmd: string[], cwd: string): never {
  process.exit(runInherit(cmd, cwd))
}
