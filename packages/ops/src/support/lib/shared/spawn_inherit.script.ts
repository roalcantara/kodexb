/** Run a subprocess with inherited stdio; return the child exit code. */
export function runInherit(cmd: string[], cwd: string): number {
  const r = Bun.spawnSync(cmd, { cwd, stdout: 'inherit', stderr: 'inherit', stdin: 'inherit' })
  return r.exitCode ?? (r.success ? 0 : 1)
}

/** Run a subprocess with inherited stdio; exit with the child exit code. */
export function spawnInherit(cmd: string[], cwd: string): never {
  process.exit(runInherit(cmd, cwd))
}
