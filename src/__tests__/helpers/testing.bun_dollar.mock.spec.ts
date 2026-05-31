import { beforeEach, describe, expect, it } from 'bun:test'

describe('testing.bun_dollar.mock', () => {
  let mod: typeof import('./testing.bun_dollar.mock')

  beforeEach(async () => {
    mod = await import('./testing.bun_dollar.mock')
  })

  it('exports installBunDollarMock as a function', () => {
    expect(typeof mod.installBunDollarMock).toBe('function')
  })

  it('exports uninstallBunDollarMock as a function', () => {
    expect(typeof mod.uninstallBunDollarMock).toBe('function')
  })

  it('exports resetBunDollarMock as a function', () => {
    expect(typeof mod.resetBunDollarMock).toBe('function')
  })

  it('exports setBunDollarThrow as a function', () => {
    expect(typeof mod.setBunDollarThrow).toBe('function')
  })

  it('exports setupBunDollarMock as a function', () => {
    expect(typeof mod.setupBunDollarMock).toBe('function')
  })

  describe('setBunDollarThrow toggles mock behavior', () => {
    beforeEach(() => {
      mod.installBunDollarMock()
    })

    it('returns mock object when setBunDollarThrow is false', () => {
      mod.setBunDollarThrow(false)
      const result = (Bun.$ as unknown as () => { quiet: () => { nothrow: () => undefined } })()
      expect(result).toBeDefined()
      expect(typeof result.quiet).toBe('function')
    })

    it('throws when setBunDollarThrow is true', () => {
      mod.setBunDollarThrow(true)
      expect(() => (Bun.$ as unknown as () => void)()).toThrow('osascript failed')
    })
  })
})
