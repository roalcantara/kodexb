import { describe, expect, it } from 'bun:test'
import { mermaidAsciiWidth, renderMermaidTerminal } from './mermaid_terminal.script'

describe('renderMermaidTerminal', () => {
  it('renders a simple LR flowchart as box-drawing', () => {
    const src = 'flowchart LR\n  a["A"] --> b["B"]'
    const ascii = renderMermaidTerminal(src)
    expect(ascii).toContain('A')
    expect(ascii).toContain('B')
    expect(mermaidAsciiWidth(ascii)).toBeGreaterThan(10)
  })
})
