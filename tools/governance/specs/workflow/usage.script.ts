/**
 * Shared CLI error + entrypoint shape for workflow scripts.
 * Keep small — the only reason for this module is dedupe across
 * handoff_generate.script.ts and orchestrated_handoff.script.ts.
 */

export class UsageError extends Error {
  readonly exitCode: number
  constructor(message: string, exitCode = 2) {
    super(message)
    this.name = 'UsageError'
    this.exitCode = exitCode
  }
}

/** Run a parser; convert `UsageError` into a numbered exit + stderr message. */
export function withUsage<T>(
  parse: () => T,
  scriptName: string,
  usageLine: string
): { value: T } | { exitCode: number } {
  try {
    return { value: parse() }
  } catch (err) {
    if (err instanceof UsageError) {
      const out = err.exitCode === 0 ? console.log : console.error
      out(err.exitCode === 0 ? err.message : `${scriptName}: ${err.message}`)
      if (err.exitCode !== 0) console.error(usageLine)
      return { exitCode: err.exitCode }
    }
    throw err
  }
}
