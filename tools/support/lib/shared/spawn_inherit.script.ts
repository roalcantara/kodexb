/** Run a subprocess with inherited stdio; exit with the child exit code. */
export function spawnInherit(cmd: string[], cwd: string): never {
  const r = Bun.spawnSync(cmd, { cwd, stdout: 'inherit', stderr: 'inherit', stdin: 'inherit' })
  process.exit(r.exitCode ?? (r.success ? 0 : 1))
}
