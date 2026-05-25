import type { Console as ConsoleType } from 'node:console'
import type { Simplify } from 'type-fest'

export type ConsoleMethod = keyof ConsoleType
export type LogWithProps = <L extends ConsoleMethod, R = void>(level: L, args: unknown[], props: LogProps<L>) => R
export type Logs = <L extends ConsoleMethod>(
  level: L
) => {
  [K in typeof level]: <R = void>(...args: unknown[]) => R
}
export type FormattedMessage = <L extends keyof ConsoleType>(args: unknown[], props?: LogProps<L>) => string
export type Loggers = Simplify<
  {
    [K in keyof ConsoleType]: Logs
  } & {
    puts: LogWithProps
  }
>
export type LogProps<L> = {
  prefix: string
  suffix: string
  level: L
}
export type CreateLoggerOpts = {
  /**
   * App log verbosity (Logtape `['kb']` lowestLevel).
   * When set with `debug`, `verbosity` wins.
   */
  verbosity?: import('../logging/log_verbosity').LogVerbosity
  /** @deprecated Prefer `verbosity`. `true` is treated as `verbosity: 'debug'`. */
  debug?: boolean
}
export type PhaseLabel = 'config_load' | 'config_reload' | 'sqlite' | 'import' | 'cache_hit' | 'cache_miss' | 'command'
