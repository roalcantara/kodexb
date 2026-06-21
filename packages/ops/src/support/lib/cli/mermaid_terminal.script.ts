/**
 * Terminal rendering for Mermaid source via beautiful-mermaid ASCII output.
 * Andromeda Void palette aligned with gum_theme.script.ts.
 */
import { renderMermaidASCII } from 'beautiful-mermaid'

const ANDROMEDA_ASCII = {
  bg: '#12151c',
  fg: '#e2e9f5',
  accent: '#5ecfbe',
  muted: '#8892a4'
} as const

export function mermaidAsciiColorMode(): 'none' | 'auto' {
  if (process.env.NO_COLOR !== undefined) return 'none'
  return process.stdout.isTTY ? 'auto' : 'none'
}

/** Render Mermaid source as Unicode box-drawing for the terminal. */
export function renderMermaidTerminal(source: string, compact = false): string {
  return renderMermaidASCII(source, {
    theme: ANDROMEDA_ASCII,
    colorMode: mermaidAsciiColorMode(),
    paddingX: compact ? 1 : 2,
    paddingY: 1,
    useAscii: false
  })
}

export function mermaidAsciiWidth(ascii: string): number {
  const lines = ascii.split('\n')
  if (lines.length === 0) return 0
  return Math.max(...lines.map(l => l.length))
}
