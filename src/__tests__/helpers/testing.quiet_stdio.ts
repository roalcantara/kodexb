import { configureSync, type Sink } from '@logtape/logtape'

/** Logtape sink that discards every record (used in tests). */
export const noopLogSink: Sink = () => undefined

/**
 * Logtape setup for the test runner: no stderr/console output and no meta
 * "loggers are configured" info line.
 */
export function configureQuietLogtape(): void {
  configureSync({
    reset: true,
    sinks: { void: noopLogSink },
    loggers: [
      { category: ['logtape', 'meta'], sinks: ['void'], lowestLevel: 'fatal' },
      { category: ['kb'], sinks: ['void'], lowestLevel: 'fatal' },
      { category: ['kb', 'sqlite'], sinks: ['void'], lowestLevel: 'fatal', parentSinks: 'override' }
    ]
  })
}

const SILENCED_CONSOLE = [
  'log',
  'info',
  'warn',
  'error',
  'debug',
  'trace',
  'dir',
  'dirxml',
  'group',
  'groupCollapsed'
] as const satisfies ReadonlyArray<keyof Console>

/** Swallow console output so React/Logtape diagnostics never pollute `bun test`. */
export function installQuietConsole(): void {
  for (const method of SILENCED_CONSOLE) {
    const fn = console[method]
    if (typeof fn === 'function') {
      console[method] = (() => undefined) as typeof fn
    }
  }
}

configureQuietLogtape()
installQuietConsole()
