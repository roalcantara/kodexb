import { resolve } from 'node:path'

export const REPO_ROOT = resolve(import.meta.dir, '../../../../')

export function spawnScript(
  binPath: string,
  env?: Record<string, string | undefined>
): { exitCode: number; stdout: string } {
  const result = Bun.spawnSync([process.execPath, binPath], {
    env: { ...process.env, ...env },
    cwd: REPO_ROOT,
    stdio: ['pipe', 'pipe', 'pipe']
  })
  return { exitCode: result.exitCode, stdout: result.stdout.toString() }
}
