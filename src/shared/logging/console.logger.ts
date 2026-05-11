import { getLogger } from '@logtape/logtape'
import type { ConsoleMethod, CreateLoggerOpts, LogProps, PhaseLabel } from '../types/logger.types'
import { syncLogging } from './logtape.adapter'

export const formatMessage = <L extends ConsoleMethod>(args: unknown[], props?: LogProps<L>) => {
  if (props) {
    return `${props.prefix}${args.map(a => String(a)).join(' ')}${props.suffix}\n`
  }
  return args.map(a => String(a)).join(' ')
}

export const createLogger = ({ debug }: CreateLoggerOpts) => {
  const dbug = debug ?? false
  syncLogging(dbug)
  return {
    isEnabled: dbug,
    assert: console.assert,
    clear: console.clear,
    count: console.count,
    countReset: console.countReset,
    debug: <L extends ConsoleMethod>(args: unknown[], props?: LogProps<L>) =>
      console.debug(formatMessage<L>(args, props)),
    info: <L extends ConsoleMethod>(args: unknown[], props?: LogProps<L>) =>
      console.info(formatMessage<L>(args, props)),
    log: <L extends ConsoleMethod>(args: unknown[], props?: LogProps<L>) => console.log(formatMessage<L>(args, props)),
    trace: <L extends ConsoleMethod>(args: unknown[], props?: LogProps<L>) =>
      console.trace(formatMessage<L>(args, props)),
    warn: <L extends ConsoleMethod>(args: unknown[], props?: LogProps<L>) =>
      console.warn(formatMessage<L>(args, props)),
    dir: <L extends ConsoleMethod>(args: unknown[], props?: LogProps<L>) => console.dir(formatMessage<L>(args, props)),
    dirxml: <L extends ConsoleMethod>(args: unknown[], props?: LogProps<L>) =>
      console.dirxml(formatMessage<L>(args, props)),
    error: <L extends ConsoleMethod>(args: unknown[], props?: LogProps<L>) =>
      console.error(formatMessage<L>(args, props)),
    group: <L extends ConsoleMethod>(args: unknown[], props?: LogProps<L>) =>
      console.group(formatMessage<L>(args, props)),
    groupCollapsed: <L extends ConsoleMethod>(args: unknown[], props?: LogProps<L>) =>
      console.groupCollapsed(formatMessage<L>(args, props)),
    puts: <L extends ConsoleMethod>(args: unknown[], props?: LogProps<L>) => console.log(formatMessage<L>(args, props)),
    fatal: (message: string) => {
      process.stderr.write(`${message}\n`)
      return process.exit(1)
    },
    phase: (phase: PhaseLabel, label: string, durMs: number) => {
      if (!dbug) return
      getLogger(['kb']).debug('{phase} label={label} dur_ms={dur_ms}', {
        phase,
        label,
        dur_ms: durMs.toFixed(2)
      })
    }
  }
}
