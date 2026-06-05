import { describe, expect, it } from 'bun:test'
import { GUM, gumAvailable, gumStyle, gumSubprocessEnv, gumTitle } from './gum.theme.ts'

describe('gumSubprocessEnv', () => {
  it('forces color when NO_COLOR is unset', () => {
    const env = gumSubprocessEnv()
    if (process.env.NO_COLOR) {
      expect(env.CLICOLOR_FORCE).toBeUndefined()
    } else {
      expect(env.CLICOLOR_FORCE).toBe('1')
    }
  })
})

describe('gum capture via Bun.spawnSync', () => {
  it('returns ANSI when gum is installed and NO_COLOR is unset', () => {
    if (!gumAvailable() || process.env.NO_COLOR) return
    const styled = gumStyle('accent', ['--foreground', GUM.accent, '--bold'])
    expect(styled.includes('\x1b')).toBe(true)
    expect(styled).toContain('accent')
  })

  it('styles titles with border and foreground escapes', () => {
    if (!gumAvailable() || process.env.NO_COLOR) return
    const title = gumTitle('Skill registry')
    expect(title.includes('\x1b')).toBe(true)
    expect(title).toContain('Skill registry')
    expect(title).toContain('╔')
  })
})
