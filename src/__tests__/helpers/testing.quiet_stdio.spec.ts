import { afterEach, describe, expect, it } from 'bun:test'
import { getLogger } from '@logtape/logtape'
import { configureQuietLogtape, installQuietConsole, noopLogSink } from './testing.quiet_stdio'

afterEach(() => {
  configureQuietLogtape()
  installQuietConsole()
})

describe('testing.quiet_stdio', () => {
  it('exports noopLogSink', () => {
    expect(typeof noopLogSink).toBe('function')
    expect(noopLogSink({} as never)).toBeUndefined()
  })

  it('configures kb logger without enabling trace', () => {
    configureQuietLogtape()
    expect(getLogger(['kb']).isEnabledFor('info')).toBe(false)
    expect(getLogger(['logtape', 'meta']).isEnabledFor('info')).toBe(false)
  })
})
