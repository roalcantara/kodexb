import type { LogLevel } from '@logtape/logtape'
import { configureSync, getConsoleSink } from '@logtape/logtape'
import { getPrettyFormatter } from '@logtape/pretty'
import type { LogVerbosity } from './log_verbosity'

let lastKey = ''

const LOWEST_BY_VERBOSITY: Record<LogVerbosity, LogLevel> = {
  default: 'warning',
  verbose: 'info',
  debug: 'debug',
  trace: 'trace'
}

/** Logtape `lowestLevel` for `['kb']` / `['kb', 'sqlite']` from app verbosity. */
export function lowestLevelForVerbosity(verbosity: LogVerbosity): LogLevel {
  return LOWEST_BY_VERBOSITY[verbosity]
}

/**
 * Idempotent Logtape setup.
 *
 * Logtape short-circuits **string + object** logs before template formatting when
 * `record.level` is below `lowestLevel` (`emitResolved` returns before reading
 * lazy `message` / `properties` getters). Template-literal calls still render
 * eagerly; use `logger.isEnabledFor('debug')` or property callbacks for heavy work.
 */
export const syncLogging = (verbosity: LogVerbosity) => {
  const key = verbosity
  if (key === lastKey) return
  lastKey = key

  const level = lowestLevelForVerbosity(verbosity)

  configureSync({
    reset: true,
    sinks: {
      stderr: getConsoleSink({
        formatter: getPrettyFormatter(),
        console: globalThis.console as Console
      })
    },
    loggers: [
      { category: ['logtape', 'meta'], sinks: ['stderr'], lowestLevel: 'warning' },
      { category: ['kb'], sinks: ['stderr'], lowestLevel: level },
      {
        category: ['kb', 'sqlite'],
        sinks: ['stderr'],
        lowestLevel: level,
        parentSinks: 'override'
      }
    ]
  })
}
