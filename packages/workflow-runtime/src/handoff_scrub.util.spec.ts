import { describe, expect, it } from 'bun:test'
import { HandoffScrubError, scrubPrompt } from './handoff_scrub.util'

describe('scrubPrompt', () => {
  it('passes clean bodies', () => {
    expect(() => scrubPrompt('implement list filter UX')).not.toThrow()
  })

  it('rejects github tokens', () => {
    expect(() => scrubPrompt('token=ghp_1234567890ABCDEFGHIJKL12345')).toThrow(HandoffScrubError)
  })
})
