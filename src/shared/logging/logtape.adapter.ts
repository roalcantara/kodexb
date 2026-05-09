import { configureSync, getConsoleSink } from '@logtape/logtape'
import { getPrettyFormatter } from '@logtape/pretty'

let lastKey = ''

/** Idempotent Logtape setup for kb. */
export const syncLogging = (debug: boolean) => {
  const key = `${debug}`
  if (key === lastKey) return
  lastKey = key

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
      { category: ['kb'], sinks: ['stderr'], lowestLevel: debug ? 'debug' : null },
      {
        category: ['kb', 'sqlite'],
        sinks: ['stderr'],
        lowestLevel: debug ? 'debug' : null,
        parentSinks: 'override'
      }
    ]
  })
}
