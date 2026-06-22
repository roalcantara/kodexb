/** Shared guards for dev-only CRG background refresh. */
export function crgOnPath(): boolean {
  return Bun.spawnSync(['sh', '-c', 'command -v code-review-graph'], { stdout: 'pipe', stderr: 'pipe' }).exitCode === 0
}

/** CRG refresh is local dev tooling — never CI or headless automation. */
export function isCrgRefreshEnvironment(): boolean {
  if (process.env.CI === 'true' || process.env.CI === '1') return false
  if (process.env.GITHUB_ACTIONS === 'true') return false
  return true
}
