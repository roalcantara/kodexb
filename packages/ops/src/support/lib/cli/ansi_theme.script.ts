/**
 * Local ANSI theme for CLI output — no subprocess per cell.
 *
 * Mirrors the Andromeda Void palette from `GUM` constants but applies ANSI
 * escape codes inline instead of shelling out to `gum style` for every cell.
 * Use in hot loops (column grids, index rows) where gum subprocess overhead
 * would dominate. For banners, tables, titles, keep using `gum_theme` helpers
 * (gum has better layout for those).
 */
const ESC = '\x1b'
const ANSI = {
  reset: `${ESC}[0m`,
  bold: `${ESC}[1m`,
  dim: `${ESC}[2m`,
  italic: `${ESC}[3m`
} as const

const FG = {
  success: `${ESC}[38;2;94;207;190m`,
  error: `${ESC}[38;2;239;68;68m`,
  warn: `${ESC}[38;2;245;158;11m`,
  accent: `${ESC}[38;2;221;183;255m`,
  muted: `${ESC}[38;2;136;146;164m`,
  label: `${ESC}[38;2;226;233;245m`
} as const

const _BG = {
  success: `${ESC}[48;2;94;207;190m`,
  muted: `${ESC}[48;2;26;31;41m`
} as const

function color256(r: number, g: number, b: number): string {
  return `${ESC}[38;2;${r};${g};${b}m`
}

export function ansiStyle(text: string, fg?: string, bold?: boolean): string {
  const parts = [fg ?? FG.label, bold ? ANSI.bold : '', text, ANSI.reset].filter(Boolean)
  return parts.join('')
}

export function ansiOk(text: string): string {
  return ansiStyle(text, FG.success, true)
}

export function ansiAccent(text: string): string {
  return ansiStyle(text, FG.accent, true)
}

export function ansiMuted(text: string): string {
  return ansiStyle(text, FG.muted)
}

export function ansiWarn(text: string): string {
  return ansiStyle(text, FG.warn)
}

export function ansiFore(text: string, hexOrRgb: string): string {
  const rgb = hexToRgb(hexOrRgb)
  if (!rgb) return text
  return ansiStyle(text, color256(rgb.r, rgb.g, rgb.b))
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!m) return null
  return {
    r: Number.parseInt(m[1] ?? '00', 16),
    g: Number.parseInt(m[2] ?? '00', 16),
    b: Number.parseInt(m[3] ?? '00', 16)
  }
}

export { ANSI, FG }
