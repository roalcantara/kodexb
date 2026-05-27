import { AsyncLocalStorage } from 'node:async_hooks'
import { configureSync, getConsoleSink, getLogger } from '@logtape/logtape'
import { getPrettyFormatter } from '@logtape/pretty'
import { type LogVerbosity, lowestLogtapeLevelForVerbosity, parseLogVerbosity } from './log_verbosity'

let configured = false

export function configureMainLogging(): void {
  if (configured) return
  configured = true

  const verbosity: LogVerbosity = parseLogVerbosity()

  if (
    verbosity === 'default' &&
    process.env.LOG_LEVEL !== undefined &&
    process.env.LOG_LEVEL.trim() !== '' &&
    !['default'].includes(process.env.LOG_LEVEL.trim().toLowerCase())
  ) {
    const metaLog = getLogger(['logtape', 'meta'])
    metaLog.warning('Unrecognized LOG_LEVEL "{value}"; falling back to "default"', {
      value: process.env.LOG_LEVEL.trim()
    })
  }

  const lowestLevel = lowestLogtapeLevelForVerbosity(verbosity)
  const format = getPrettyFormatter()
  const categoryLoggers = [
    { category: ['logtape', 'meta'], sinks: ['console'], lowestLevel: 'warning' as const },
    { category: ['kb'], sinks: ['console'], lowestLevel },
    { category: ['kb', 'sqlite'], sinks: ['console'], lowestLevel, parentSinks: 'override' as const }
  ]

  configureSync({
    reset: true,
    contextLocalStorage: new AsyncLocalStorage(),
    sinks: { console: getConsoleSink({ formatter: format }) },
    loggers: categoryLoggers
  })
}
