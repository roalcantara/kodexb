import { describe, expect, it } from 'bun:test'
import { normalizeScope } from './spec_style.script'

describe('normalizeScope', () => {
  it('resolves alias "core" to src/core', () => {
    expect(normalizeScope('core')).toBe('src/core')
  })

  it('passes through a "src/" path', () => {
    expect(normalizeScope('src/shell/renderer')).toBe('src/shell/renderer')
  })
})
