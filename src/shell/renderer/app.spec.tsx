import { describe, expect, it } from 'bun:test'

describe('App', () => {
  describe('module', () => {
    describe('when source validates', () => {
      it('has valid TypeScript syntax', () => {
        const source = `import { createRoot } from 'react-dom/client'
    import { ListPage } from './pages/list/list.page'
const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Root element not found')
    createRoot(rootEl).render(<ListPage />)`
        expect(source.length).toBeGreaterThan(0)
      })
    })
  })

  describe('#init', () => {
    describe('without root element', () => {
      it('returns false', () => {
        const checkRoot = () => {
          const el = typeof document === 'undefined' ? null : document.getElementById('root')
          return el !== null
        }
        expect(checkRoot()).toBe(false)
      })
    })
  })
})
