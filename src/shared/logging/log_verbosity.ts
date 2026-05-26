/**
 * Runtime log verbosity for app Logtape categories.
 *
 * Maps to `lowestLevel` on category `['kb']` (and `['kb', 'sqlite']`):
 * - default → warning
 * - verbose → info
 * - debug → debug
 * - trace → trace
 *
 * Set via `LOG_LEVEL` (e.g. `LOG_LEVEL=verbose bun run dev`). Invalid values fall back to `default`.
 */
export type LogVerbosity = 'default' | 'verbose' | 'debug' | 'trace'

/** Logtape `lowestLevel` values used by main and renderer configuration. */
export type LogtapeLevel = 'trace' | 'debug' | 'info' | 'warning' | 'error' | 'fatal'

const LOWEST_BY_VERBOSITY: Record<LogVerbosity, LogtapeLevel> = {
  default: 'warning',
  verbose: 'info',
  debug: 'debug',
  trace: 'trace'
}

/** Map `LOG_LEVEL` verbosity to Logtape `lowestLevel` (shared by main and renderer). */
export function lowestLogtapeLevelForVerbosity(verbosity: LogVerbosity): LogtapeLevel {
  return LOWEST_BY_VERBOSITY[verbosity]
}

const LEVELS: readonly LogVerbosity[] = ['default', 'verbose', 'debug', 'trace'] as const

export function isLogVerbosity(value: string): value is LogVerbosity {
  return (LEVELS as readonly string[]).includes(value)
}

/** Read `LOG_LEVEL` from env; empty or invalid → `default`. */
export function parseLogVerbosity(env: Record<string, string | undefined> = process.env): LogVerbosity {
  const raw = env.LOG_LEVEL?.trim().toLowerCase()
  if (!raw) return 'default'
  return isLogVerbosity(raw) ? raw : 'default'
}
