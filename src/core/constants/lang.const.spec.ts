import { describe, expect, it } from 'bun:test'
import { MARKDOWN_SUPPORTED_LANGS } from './lang.const'

describe('lang.const', () => {
  it('MARKDOWN_SUPPORTED_LANGS is non-empty and includes common fence ids', () => {
    expect(MARKDOWN_SUPPORTED_LANGS.length).toBeGreaterThan(100)
    expect(MARKDOWN_SUPPORTED_LANGS).toContain('markdown')
    expect(MARKDOWN_SUPPORTED_LANGS).toContain('typescript')
    expect(MARKDOWN_SUPPORTED_LANGS).toContain('mermaid')
  })
})
