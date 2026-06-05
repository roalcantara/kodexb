/** Git checkout root — use when scripts must not assume process.cwd(). */
export function repoRoot(): string {
  const r = Bun.spawnSync(['git', 'rev-parse', '--show-toplevel'])
  if (r.exitCode !== 0) {
    console.error('run from inside the app git checkout')
    process.exit(1)
  }
  return new TextDecoder().decode(r.stdout).trim()
}

/** chdir to repo root; returns root path. */
export function chdirToRepoRoot(): string {
  const root = repoRoot()
  process.chdir(root)
  return root
}
