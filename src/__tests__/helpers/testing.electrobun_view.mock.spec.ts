import { describe, expect, it } from 'bun:test'
import { setRpcCallHandler } from './testing.electrobun_view.mock'

describe('testing.electrobun_view.mock', () => {
  it('exports setRpcCallHandler', () => {
    expect(typeof setRpcCallHandler).toBe('function')
  })
})
