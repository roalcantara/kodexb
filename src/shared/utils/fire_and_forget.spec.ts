import { describe, expect, it } from 'bun:test'
import { fireAndForget } from './fire_and_forget'

describe('fireAndForget', () => {
  it('swallows promise rejection', async () => {
    fireAndForget(Promise.reject(new Error('ignored')))
    await Promise.resolve()
    expect(true).toBe(true)
  })
})
