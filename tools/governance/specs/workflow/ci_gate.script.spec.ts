import { describe, expect, it } from 'bun:test'
import { checkCiGate, isCiFailing, isCiGreen, isCiPending } from './ci_gate.script.ts'

describe('checkCiGate', () => {
  it('AWO-6 AC3: returns pass on exit code 0', () => {
    expect(checkCiGate(0, 0, 3)).toBe('pass')
    expect(checkCiGate(0, 5, 3)).toBe('pass')
  })

  it('returns retry when within retry budget', () => {
    expect(checkCiGate(1, 0, 3)).toBe('retry')
    expect(checkCiGate(1, 2, 3)).toBe('retry')
  })

  it('AWO-6 AC4: returns escalate when retry budget exhausted', () => {
    expect(checkCiGate(1, 3, 3)).toBe('escalate')
    expect(checkCiGate(1, 5, 3)).toBe('escalate')
  })

  it('handles null exit code as pending', () => {
    expect(isCiPending(null)).toBe(true)
    expect(checkCiGate(null, 0, 3)).toBe('retry')
  })

  it('returns escalate when null exit code with exhausted retries', () => {
    expect(checkCiGate(null, 3, 3)).toBe('escalate')
  })
})

describe('isCiGreen', () => {
  it('true for exit code 0', () => expect(isCiGreen(0)).toBe(true))
  it('false for non-zero', () => expect(isCiGreen(1)).toBe(false))
  it('false for null', () => expect(isCiGreen(null)).toBe(false))
})

describe('isCiFailing', () => {
  it('true for non-zero', () => expect(isCiFailing(1)).toBe(true))
  it('false for zero', () => expect(isCiFailing(0)).toBe(false))
  it('false for null', () => expect(isCiFailing(null)).toBe(false))
})
