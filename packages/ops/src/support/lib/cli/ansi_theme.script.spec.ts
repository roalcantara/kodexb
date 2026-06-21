import { describe, expect, it } from 'bun:test'
import { ansiFore, ansiMuted, ansiOk, ansiStyle, FG } from './ansi_theme.script'

describe('ansiStyle', () => {
  it('wraps text in ANSI escapes', () => {
    const out = ansiStyle('hello', FG.success, true)
    expect(out).toContain('hello')
    expect(out).toContain('\x1b[')
    expect(out).toContain('\x1b[0m')
  })

  it('applies foreground and bold', () => {
    const out = ansiStyle('x', FG.label, true)
    expect(out).toContain('\x1b[1m')
    expect(out).toContain(FG.label)
  })
})

describe('ansiOk', () => {
  it('returns green bold text', () => {
    const out = ansiOk('done')
    expect(out).toContain('done')
    expect(out).toContain(FG.success)
  })
})

describe('ansiMuted', () => {
  it('returns muted text', () => {
    expect(ansiMuted('info')).toContain(FG.muted)
  })
})

describe('ansiFore', () => {
  it('applies hex color', () => {
    const out = ansiFore('colored', '#3399ff')
    expect(out).toContain('\x1b[38;2;51;153;255m')
  })

  it('returns plain text for invalid hex', () => {
    expect(ansiFore('plain', 'nope')).toBe('plain')
  })
})
