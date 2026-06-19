let configured = false

export function configureOpsLogging(): void {
  if (configured) return
  configured = true
  try {
    // biome-ignore lint/style/noCommonJs: ESM import can't be in try/catch
    const { configureSync, getConsoleSink } = require('@logtape/logtape') as {
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
