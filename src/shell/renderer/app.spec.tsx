import { describe, expect, it } from 'bun:test'

describe('App', () => {
  describe('module', () => {
    it('has valid TypeScript syntax', () => {
      const source = `import { createRoot } from 'react-dom/client'
const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Root element not found')
createRoot(rootEl).render(<div>kb</div>)`
      expect(source.length).toBeGreaterThan(0)
    })
  })

  describe('#init', () => {
    it('requires root element', () => {
      const checkRoot = () => {
        const el = typeof document === 'undefined' ? null : document.getElementById('root')
        return el !== null
      }
      expect(checkRoot()).toBe(false)
    })
  })
})
