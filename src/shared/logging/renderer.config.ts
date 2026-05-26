import { configureSync, getConsoleSink } from '@logtape/logtape'
import { getPrettyFormatter } from '@logtape/pretty'
import {
  type LogtapeLevel,
  lowestLogtapeLevelForVerbosity,
  parseLogVerbosity
} from './log_verbosity'
import { RENDERER_BUILD_ENV } from './renderer_build_env'

/**
 * Effective Logtape `lowestLevel` for `['kb', 'ui', …]` from a LOG_LEVEL env record.
 * Uses the same mapping as `configureMainLogging()`.
 */
export function rendererLoggingLowestLevelFromEnv(
  env: Readonly<Record<string, string | undefined>> = RENDERER_BUILD_ENV
): LogtapeLevel {
  return lowestLogtapeLevelForVerbosity(parseLogVerbosity(env))
}

let configured = false

export function configureRendererLogging(): void {
  if (configured) return
  configured = true

  const lowestLevel = rendererLoggingLowestLevelFromEnv()

  configureSync({
    reset: true,
    sinks: { devtools: getConsoleSink({ formatter: getPrettyFormatter() }) },
    loggers: [
      { category: ['logtape', 'meta'], sinks: ['devtools'], lowestLevel: 'warning' },
      { category: ['kb', 'ui'], sinks: ['devtools'], lowestLevel }
    ]
  })
}
