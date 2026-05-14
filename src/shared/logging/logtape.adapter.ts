import type { LogLevel } from '@logtape/logtape'
import { configureSync, getConsoleSink } from '@logtape/logtape'
import { getPrettyFormatter } from '@logtape/pretty'
import type { KbLogVerbosity } from './kb_log_verbosity'

let lastKey = ''

const KB_LOWEST: Record<KbLogVerbosity, LogLevel> = {
  default: 'warning',
  verbose: 'info',
  debug: 'debug',
  trace: 'trace'
}

/** Logtape `lowestLevel` for `['kb']` / `['kb', 'sqlite']` from app verbosity. */
export function kbLowestLevel(verbosity: KbLogVerbosity): LogLevel {
  return KB_LOWEST[verbosity]
}

/**
 * Idempotent Logtape setup for kb.
 *
 * Logtape short-circuits **string + object** logs before template formatting when
 * `record.level` is below `lowestLevel` (`emitResolved` returns before reading
 * lazy `message` / `properties` getters). Template-literal calls still render
 * eagerly; use `logger.isEnabledFor('debug')` or property callbacks for heavy work.
 */
export const syncLogging = (verbosity: KbLogVerbosity) => {
  const key = verbosity
  if (key === lastKey) return
  lastKey = key

  const kbLevel = kbLowestLevel(verbosity)

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
      { category: ['kb'], sinks: ['stderr'], lowestLevel: kbLevel },
      {
        category: ['kb', 'sqlite'],
        sinks: ['stderr'],
        lowestLevel: kbLevel,
        parentSinks: 'override'
      }
    ]
  })
}
