import { configureSync, getConsoleSink } from '@logtape/logtape'
import { getPrettyFormatter } from '@logtape/pretty'
import { type LogtapeLevel, lowestLogtapeLevelForVerbosity, parseLogVerbosity } from './log_verbosity'

const buildTimeEnv: Record<string, string | undefined> = typeof process === 'undefined' ? {} : process.env

/**
 * Environment snapshot taken when Electrobun builds the `shell` view bundle.
 *
 * The parent `bun run dev` / `electrobun dev` process has `LOG_LEVEL`; the CEF
 * webview does not. Bun inlines these literals into `views/shell/index.js` so
 * `configureRendererLogging()` can honor the same dial without `process` at runtime.
 *
 * Restart dev after changing `LOG_LEVEL` so the view is rebuilt.
 */
export const RENDERER_BUILD_ENV: Readonly<Record<string, string | undefined>> = {
  LOG_LEVEL: buildTimeEnv.LOG_LEVEL,
  NODE_ENV: buildTimeEnv.NODE_ENV
}

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
