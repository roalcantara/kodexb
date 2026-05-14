import { afterEach, describe, expect, test } from 'bun:test'
import { configureSync, getLogger } from '@logtape/logtape'
import { createLogger } from './console.logger'
import { syncLogging } from './logtape.adapter'

afterEach(() => {
  configureSync({ reset: true, sinks: {}, loggers: [] })
})

describe('createLogger verbosity', () => {
  test('verbosity option configures Logtape', () => {
    createLogger({ verbosity: 'verbose' })
    expect(getLogger(['kb']).isEnabledFor('info')).toBe(true)
    expect(getLogger(['kb']).isEnabledFor('debug')).toBe(false)
  })

  test('debug: true maps to debug verbosity', () => {
    createLogger({ debug: true })
    expect(getLogger(['kb']).isEnabledFor('debug')).toBe(true)
  })

  test('verbosity wins over debug', () => {
    createLogger({ verbosity: 'default', debug: true })
    expect(getLogger(['kb']).isEnabledFor('debug')).toBe(false)
    expect(getLogger(['kb']).isEnabledFor('warning')).toBe(true)
  })
})

describe('syncLogging idempotency', () => {
  test('same verbosity does not reset twice', () => {
    syncLogging('verbose')
    syncLogging('verbose')
    expect(getLogger(['kb']).isEnabledFor('info')).toBe(true)
  })
})
