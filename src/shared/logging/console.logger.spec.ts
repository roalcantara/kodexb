import { afterEach, describe, expect, it } from 'bun:test'
import { getLogger } from '@logtape/logtape'
import { configureQuietLogtape } from '@testing'
import { createLogger } from './console.logger'
import { syncLogging } from './logtape.adapter'

afterEach(() => {
  configureQuietLogtape()
})

describe('createLogger verbosity', () => {
  it('maps to log level', () => {
    createLogger({ verbosity: 'verbose' })
    expect(getLogger(['kb']).isEnabledFor('info')).toBe(true)
    expect(getLogger(['kb']).isEnabledFor('debug')).toBe(false)
  })

  it('debug flag enables debug', () => {
    createLogger({ debug: true })
    expect(getLogger(['kb']).isEnabledFor('debug')).toBe(true)
  })

  it('verbosity overrides debug flag', () => {
    createLogger({ verbosity: 'default', debug: true })
    expect(getLogger(['kb']).isEnabledFor('debug')).toBe(false)
    expect(getLogger(['kb']).isEnabledFor('warning')).toBe(true)
  })
})

describe('syncLogging idempotency', () => {
  it('idempotent for same value', () => {
    syncLogging('verbose')
    syncLogging('verbose')
    expect(getLogger(['kb']).isEnabledFor('info')).toBe(true)
  })
})
