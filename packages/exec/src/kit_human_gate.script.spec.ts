import { describe, expect, it } from 'bun:test'
import { clearGate } from './kit_human_gate.script'

describe('kit_human_gate', () => {
  it('rejects path-like gate stage ids', () => {
    expect(() => clearGate('/tmp/feature', 'run-1', '../escape')).toThrow('invalid gate stage')
  })
})
