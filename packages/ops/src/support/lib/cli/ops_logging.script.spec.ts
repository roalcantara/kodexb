import { describe, expect, it } from 'bun:test'
import { configureOpsLogging } from './ops_logging.script'

describe('configureOpsLogging', () => {
  it('is idempotent — second call does not throw', () => {
    expect(() => {
      configureOpsLogging()
      configureOpsLogging()
    }).not.toThrow()
  })
})
