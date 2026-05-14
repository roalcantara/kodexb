/**
 * Runtime log verbosity for kb Logtape categories.
 *
 * Maps to `lowestLevel` on category `['kb']` (and `['kb', 'sqlite']`):
 * - default → warning
 * - verbose → info
 * - debug → debug
 * - trace → trace
 *
 * Set via `KB_LOG` (e.g. `KB_LOG=verbose bun run dev`). Invalid values fall back to `default`.
 */
export type KbLogVerbosity = 'default' | 'verbose' | 'debug' | 'trace'

const LEVELS: readonly KbLogVerbosity[] = ['default', 'verbose', 'debug', 'trace'] as const

export function isKbLogVerbosity(value: string): value is KbLogVerbosity {
  return (LEVELS as readonly string[]).includes(value)
}

/** Read `KB_LOG` from env; empty or invalid → `default`. */
export function parseKbLogVerbosity(env: Record<string, string | undefined> = process.env): KbLogVerbosity {
  const raw = env.KB_LOG?.trim().toLowerCase()
  if (!raw) return 'default'
  return isKbLogVerbosity(raw) ? raw : 'default'
}
