import { describe, expect, it } from 'bun:test'
import { runSpecAudit } from './spec_audit.script'

describe('runSpecAudit', () => {
  it('does not throw on a known codebase', () => {
    expect(() => runSpecAudit(process.cwd(), false)).not.toThrow()
  })
})
