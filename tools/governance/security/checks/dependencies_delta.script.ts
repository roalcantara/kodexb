import { spawnSync } from 'node:child_process'

export type LockDelta = {
  packageName: string
  version: string
}

export type GitRunner = (args: string[]) => { status: number; stdout: Buffer }

export const defaultGitRunner: GitRunner = (args: string[]) => {
  const diff = spawnSync('git', args)
  return { status: diff.status ?? 1, stdout: diff.stdout as Buffer }
}

/**
 * Identify added or bumped packages in bun.lock using git diff.
 * Bun.lock format is simple: "package version" per line.
 */
export function parseLockDelta(
  lockfilePath: string,
  base: string = 'HEAD',
  gitRunner: GitRunner = defaultGitRunner
): LockDelta[] {
  const diff = gitRunner(['diff', '-U0', base, '--', lockfilePath])
  if (diff.status !== 0) {
    throw new Error(`git diff failed for ${lockfilePath}`)
  }
  const stdout = new TextDecoder().decode(diff.stdout)
  const deltas: LockDelta[] = []

  // Match added lines: "+ package version"
  const lineRe = /^\+\s*([@a-z0-9/._-]+)\s+([a-z0-9.+-]+)$/im

  for (const line of stdout.split('\n')) {
    const m = line.match(lineRe)
    if (!m?.[1] || !m[2]) continue
    deltas.push({ packageName: m[1], version: m[2] })
  }

  return deltas
}
