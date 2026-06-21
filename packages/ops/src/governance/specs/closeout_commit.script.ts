/**
 * Optional git commit step for spec closeout (operator-initiated via --commit).
 */
import path from 'node:path'
import { slugFromFeatureDir } from './resolve_catalog_key.script'

export type CloseoutCommitOpts = {
  root: string
  featureDir: string
  message?: string
}

function git(args: string[], cwd: string): { exitCode: number; stdout: string } {
  const proc = Bun.spawnSync(['git', ...args], { cwd, stdout: 'pipe', stderr: 'inherit' })
  const stdout = proc.stdout ? new TextDecoder().decode(proc.stdout) : ''
  return { exitCode: proc.exitCode ?? 1, stdout }
}

export function defaultCloseoutCommitMessage(featureDir: string): string {
  const slug = slugFromFeatureDir(featureDir)
  return `chore(spec): closeout ${slug}`
}

export function runCloseoutCommit(opts: CloseoutCommitOpts): number {
  const status = git(['status', '--porcelain'], opts.root)
  if (status.exitCode !== 0) return status.exitCode
  if (!status.stdout.trim()) {
    console.error('closeout commit: working tree clean — nothing to commit')
    return 0
  }

  const add = git(['add', '-A'], opts.root)
  if (add.exitCode !== 0) return add.exitCode

  const message = (opts.message ?? defaultCloseoutCommitMessage(opts.featureDir)).trim()
  const rel = path.relative(opts.root, opts.featureDir) || opts.featureDir
  const body = `Automated spec closeout for ${rel}.`
  const commit = git(['commit', '-m', message, '-m', body], opts.root)
  return commit.exitCode
}
