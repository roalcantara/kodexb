import { describe, expect, it } from 'bun:test'
import { factoryFor } from '@testing'
import { buildShortcutPreamble } from './doc.shortcut.parser'

describe('buildShortcutPreamble', () => {
  it('lists every binding action so FTS can find them', () => {
    const out = buildShortcutPreamble(factoryFor('shortcut:vscodeKeymap'))
    expect(out).toContain('Go to File')
    expect(out).toContain('cmd+p')
    expect(out).toContain('### BINDINGS')
  })

  it('returns empty string when there are no bindings', () => {
    const out = buildShortcutPreamble(factoryFor('shortcut:vscodeKeymap', { overrides: { bindings: [] } }))
    expect(out).toBe('')
  })

  it('joins multi-step chord with spaces and modifiers with +', () => {
    const out = buildShortcutPreamble(
      factoryFor('shortcut:vscodeKeymap', {
        overrides: {
          bindings: [
            {
              id: 'release-go',
              chord: [
                { modifiers: ['cmd'], key: 'k' },
                { modifiers: [], key: 'p' }
              ],
              scope: 'local',
              action: 'Release Go To File'
            }
          ]
        }
      })
    )
    expect(out).toContain('cmd+k p')
    expect(out).toContain('Release Go To File')
  })
})
