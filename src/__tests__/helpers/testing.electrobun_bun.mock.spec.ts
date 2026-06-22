import { describe, expect, it } from 'bun:test'
import { ELECTROBUN_DEFINE_RPC, installElectrobunBunMock } from './testing.electrobun_bun.mock'

describe('testing.electrobun_bun.mock', () => {
  it('exports BrowserView.defineRPC on electrobun/bun', async () => {
    installElectrobunBunMock()
    const { BrowserView } = await import('electrobun/bun')
    expect(typeof BrowserView[ELECTROBUN_DEFINE_RPC]).toBe('function')
  })
})
