// @security
import { describe, expect, it } from 'bun:test'
import { HandoffScrubError, scrubPrompt } from './handoff_scrub.script.ts'

describe('handoff_scrub', () => {
  it('throws on secret-like content', () => {
    expect(() => scrubPrompt('token=ghp_1234567890ABCDEFGHIJKL12345')).toThrow(HandoffScrubError)
  })

  it('throws on absolute paths outside safe scope', () => {
    expect(() => scrubPrompt('open /Users/roalcantara/.ssh/id_rsa')).toThrow(HandoffScrubError)
  })

  it('throws on environment variable literals', () => {
    expect(() => scrubPrompt('use process.env.OPENAI_API_KEY')).toThrow(HandoffScrubError)
  })

  it('passes for clean prompt body', () => {
    expect(() => scrubPrompt('safe prompt body with no sensitive literals')).not.toThrow()
  })
})
