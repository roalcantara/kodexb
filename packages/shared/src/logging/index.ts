import { createRequire } from 'node:module'

const Require = createRequire(import.meta.url)

let configured = false

export function configureOpsLogging(): void {
  if (configured) return
  configured = true
  try {
    const { configureSync, getConsoleSink } = Require('@logtape/logtape') as {
      configureSync: (opts: {
        sinks: Record<string, unknown>
        filters?: Record<string, unknown>
        loggers: { category: string[]; sink: string; lowestLevel?: string }[]
      }) => void
      getConsoleSink: (opts?: { stream?: 'stderr' }) => unknown
    }
    configureSync({
      sinks: { stderr: getConsoleSink({ stream: 'stderr' }) },
      loggers: [
        { category: ['logtape', 'meta'], sink: 'stderr', lowestLevel: 'warn' },
        {
          category: ['kb', 'ops'],
          sink: 'stderr',
          lowestLevel: process.env.LOG_LEVEL ?? 'info'
        }
      ]
    })
  } catch {
    // LogTape may not be available in all environments
  }
}

export type Logger = {
  error: (msg: string, metadata?: Record<string, unknown>) => void
  warn: (msg: string, metadata?: Record<string, unknown>) => void
  info: (msg: string, metadata?: Record<string, unknown>) => void
  debug: (msg: string, metadata?: Record<string, unknown>) => void
  trace: (msg: string, metadata?: Record<string, unknown>) => void
}

function createFallbackLogger(category: string[]): Logger {
  const prefix = `[${category.join('.')}]`
  return {
    error(msg: string) {
      console.error(`${prefix} ${msg}`)
    },
    warn(msg: string) {
      console.warn(`${prefix} ${msg}`)
    },
    info(msg: string) {
      console.log(`${prefix} ${msg}`)
    },
    debug(msg: string) {
      console.log(`${prefix} ${msg}`)
    },
    trace(msg: string) {
      console.log(`${prefix} ${msg}`)
    }
  }
}

export function getLogger(category: string[]): Logger {
  try {
    const { getLogger: logtapeGetLogger } = Require('@logtape/logtape') as {
      getLogger: (category: string[]) => Logger
    }
    return logtapeGetLogger(category)
  } catch {
    return createFallbackLogger(category)
  }
}
