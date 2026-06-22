/**
 * HK gitleaks step argv builders and scan runners.
 *
 * Pre-commit uses `protect --staged` (see hk.pkl). The legacy `Builtins.gitleaks`
 * `dir {{ files }}` path remains for regression tests — multi-path `dir` scans
 * the whole checkout in gitleaks 8.30.x.
 *
 * @see https://hk.jdx.dev/builtins.html
 */
export const HK_GITLEAKS_PROTECT_STAGED_FLAGS = ['protect', '--staged', '--redact', '--verbose', '--no-banner'] as const

/** Legacy HK Builtins.gitleaks — do not use in hooks; kept to document the dir bug. */
export const HK_GITLEAKS_DIR_FLAGS = ['dir', '--redact', '--verbose', '--no-banner'] as const

export function buildHkGitleaksProtectStagedArgv(): string[] {
  return [...HK_GITLEAKS_PROTECT_STAGED_FLAGS]
}

export function buildHkGitleaksDirArgv(paths: readonly string[]): string[] {
  return [...HK_GITLEAKS_DIR_FLAGS, ...paths]
}

/** Parse `scanned ~123456 bytes` from gitleaks stderr/stdout. */
export function parseGitleaksScannedBytes(log: string): number | null {
  const match = log.match(/scanned ~(\d+) bytes/)
  if (!match?.[1]) return null
  const parsed = Number(match[1])
  return Number.isFinite(parsed) ? parsed : null
}

export type GitleaksRun = {
  exitCode: number
  stdout: string
  stderr: string
  scannedBytes: number | null
}

function runGitleaks(argv: readonly string[], cwd: string): GitleaksRun {
  const proc = Bun.spawnSync(['gitleaks', ...argv], {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
    env: process.env
  })
  const stdout = new TextDecoder().decode(proc.stdout)
  const stderr = new TextDecoder().decode(proc.stderr)
  return {
    exitCode: proc.exitCode ?? 1,
    stdout,
    stderr,
    scannedBytes: parseGitleaksScannedBytes(`${stderr}\n${stdout}`)
  }
}

/** HK pre-commit / hygiene step — scans git index only. */
export function runHkGitleaksProtectStaged(cwd: string): GitleaksRun {
  return runGitleaks(buildHkGitleaksProtectStagedArgv(), cwd)
}

/** Legacy `gitleaks dir` multi-path invocation (regression harness only). */
export function runHkGitleaksDir(paths: readonly string[], cwd: string): GitleaksRun {
  return runGitleaks(buildHkGitleaksDirArgv(paths), cwd)
}

export function gitleaksOnPath(): boolean {
  return Bun.spawnSync(['sh', '-c', 'command -v gitleaks'], { stdout: 'pipe', stderr: 'pipe' }).exitCode === 0
}
