import type { Database, Statement } from 'bun:sqlite'
import { getLogger } from '@logtape/logtape'

export type SqlEntry = string | { noun: string; sql: string }

export type RepositoryStmts<S extends Record<string, SqlEntry>> = {
  // biome-ignore lint/suspicious/noExplicitAny: bun:sqlite Statement any param
  [K in keyof S]: Statement<unknown, any[]>
}

const ROWS_LIMIT = 200
const REPR_DEPTH = 0

type WrappableMethod = 'all' | 'get' | 'run' | 'values'

// biome-ignore lint/suspicious/noExplicitAny: bun:sqlite method signatures use any[]
type StatementMethod = (...args: any[]) => unknown

function resolveEntry(entry: SqlEntry): { noun: string; sql: string } {
  return typeof entry === 'string' ? { noun: '', sql: entry } : entry
}

function rowCount(method: WrappableMethod, result: unknown): number {
  if (method === 'all' && Array.isArray(result)) return result.length
  if (method === 'values' && Array.isArray(result)) return result.length
  if (method === 'get') return result ? 1 : 0
  if (method === 'run') return (result as { changes?: number }).changes ?? 0
  return 0
}

function firstRow(method: WrappableMethod, result: unknown): Record<string, unknown> | undefined {
  if (method === 'get') return (result as Record<string, unknown> | null) ?? undefined
  if (method === 'all' && Array.isArray(result) && result.length > 0) {
    return result[0] as Record<string, unknown>
  }
}

/**
 * Rails-style `#<Noun field: value, field: value, …>` for a single row.
 * Truncated to 200 characters with a trailing `…>` if longer. Returns
 * `undefined` when there is no row.
 */
function representFirstRow(noun: string, row: Record<string, unknown> | undefined): string | undefined {
  if (!row) return
  const inner = Object.entries(row)
    .map(([k, v]) => `${k}: ${Bun.inspect(v, { depth: REPR_DEPTH })}`)
    .join(', ')
  const text = `#<${noun} ${inner}>`
  return text.length > ROWS_LIMIT ? `${text.slice(0, ROWS_LIMIT - 2)}…>` : text
}

function wrapMethod(
  // biome-ignore lint/suspicious/noExplicitAny: bun:sqlite Statement any param
  inner: Statement<unknown, any[]>,
  method: WrappableMethod,
  noun: string,
  sql: string,
  traceEnabled: boolean
): void {
  const logger = getLogger(['kb', 'sqlite'])
  const orig = (inner[method] as unknown as StatementMethod).bind(inner)

  ;(inner as unknown as Record<string, unknown>)[method] = (...params: unknown[]) => {
    const start = performance.now()
    try {
      const result = orig(...params)
      const duration = Math.round((performance.now() - start) * 10) / 10
      const rows = rowCount(method, result)

      const props: Record<string, unknown> = {
        noun,
        sql,
        duration_ms: duration,
        rows
      }

      if (traceEnabled) {
        props.binds = params
        const representation = representFirstRow(noun, firstRow(method, result))
        if (representation !== undefined) props.representation = representation
      }

      logger.debug('{noun} ({duration_ms}ms) rows={rows}', props)
      return result
    } catch (err) {
      const error = err as Error
      logger.error('{noun} query failed: {message}', {
        noun,
        sql,
        binds: params,
        message: error.message,
        stack: error.stack
      })
      throw err
    }
  }
}

function wrapIterate(inner: unknown, noun: string, sql: string): void {
  const logger = getLogger(['kb', 'sqlite'])
  const target = inner as { iterate?: StatementMethod } & Record<string, unknown>
  const orig = target.iterate
  if (typeof orig !== 'function') return
  const bound = orig.bind(target)

  target.iterate = (...params: unknown[]) => {
    logger.debug('{noun} iterate', { noun, sql })
    return bound(...params)
  }
}

/**
 * Build a typed bag of `bun:sqlite` prepared statements with logging
 * instrumentation on `.all() / .get() / .run() / .values() / .iterate()`.
 *
 * At `LOG_LEVEL=default` the wrapper short-circuits via
 * `logger.isEnabledFor('debug')` and returns the original `Statement`
 * unmodified — adding at most one boolean check of overhead per call.
 *
 * At `LOG_LEVEL=debug` every invocation emits one `debug` record at
 * `['kb', 'sqlite']` with `{ noun, sql, duration_ms, rows }`. At
 * `LOG_LEVEL=trace` the same record additionally carries `binds` and a
 * single-line `representation` of the first result row.
 */
export function repositoryStmts<S extends Record<string, SqlEntry>>(
  db: Database,
  defaultNoun: string,
  sqlMap: S
): RepositoryStmts<S> {
  const logger = getLogger(['kb', 'sqlite'])
  const debugEnabled = logger.isEnabledFor('debug')
  const traceEnabled = debugEnabled && logger.isEnabledFor('trace')
  // biome-ignore lint/suspicious/noExplicitAny: bun:sqlite Statement any param
  const result = {} as Record<string, Statement<unknown, any[]>>

  for (const [key, entry] of Object.entries(sqlMap)) {
    const { noun, sql } = resolveEntry(entry as SqlEntry)
    const effectiveNoun = noun || defaultNoun
    const stmt = db.query(sql)

    if (!debugEnabled) {
      result[key] = stmt
      continue
    }

    wrapMethod(stmt, 'all', effectiveNoun, sql, traceEnabled)
    wrapMethod(stmt, 'get', effectiveNoun, sql, traceEnabled)
    wrapMethod(stmt, 'run', effectiveNoun, sql, traceEnabled)
    wrapMethod(stmt, 'values', effectiveNoun, sql, traceEnabled)
    wrapIterate(stmt, effectiveNoun, sql)

    result[key] = stmt
  }

  return result as RepositoryStmts<S>
}
