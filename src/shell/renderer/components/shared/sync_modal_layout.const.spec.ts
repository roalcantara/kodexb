import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { SYNC_MODAL_WIDTH_PX } from './sync_modal_layout.const'

const syncCssPath = path.join(import.meta.dirname, '../../styles/components/sync.css')

describe('sync_modal_layout.const', () => {
  it('exports the fixed modal width used by sync.css', () => {
    expect(SYNC_MODAL_WIDTH_PX).toBe(560)
  })

  it('sync.css locks modal width and wraps long error text', () => {
    const css = readFileSync(syncCssPath, 'utf8')
    expect(css).toContain('width: min(var(--overlay-shell-width')
    expect(css).toContain('overflow-wrap: anywhere')
    expect(css).toContain('overflow-x: hidden')
  })
})
