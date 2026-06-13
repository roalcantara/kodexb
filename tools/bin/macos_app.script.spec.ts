import { describe, expect, it } from 'bun:test'
import { buildInstallCommands, buildLoginItemScript } from './macos_app.script'

describe('buildInstallCommands', () => {
  it('returns the macOS install steps for the packaged app bundle', () => {
    expect(buildInstallCommands()).toEqual([
      'bun run build',
      'rm -rf "/Applications/kb.app"',
      'cp -R "build/dev-macos-arm64/kb-dev.app" "/Applications/kb.app"',
      'xattr -d com.apple.quarantine "/Applications/kb.app" 2>/dev/null || true'
    ])
  })
})

describe('buildLoginItemScript', () => {
  it('builds an enable script that creates the login item when missing', () => {
    const script = buildLoginItemScript('enable')

    expect(script).toContain('make login item at end')
    expect(script).toContain('/Applications/kb.app')
    expect(script).toContain('hidden:false')
  })

  it('builds a disable script that removes the installed app login item', () => {
    const script = buildLoginItemScript('disable')

    expect(script).toContain('delete login item "kb"')
    expect(script).toContain('try')
  })
})
