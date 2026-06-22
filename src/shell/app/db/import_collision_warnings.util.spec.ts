import { describe, expect, it } from 'bun:test'
import { factoryFor } from '@testing'
import type { BindingRef } from '@shared/rpc'
import {
  collectHardCollisionWarnings,
  formatHardCollisionWarning,
  hardCollisionWarningMessages
} from './import_collision_warnings.util'

function globalRef(overrides: Partial<BindingRef> & Pick<BindingRef, 'bindingId' | 'app' | 'action'>): BindingRef {
  return factoryFor('bindingRef:global', { overrides })
}

describe('collectHardCollisionWarnings()', () => {
  it('returns a hard global-global warning', () => {
    const bindings = [
      globalRef({ bindingId: 'a:1', app: 'release-macos', action: 'Release Spotlight' }),
      globalRef({ bindingId: 'b:1', app: 'release-amethyst', action: 'Release Spotlight' })
    ]
    const warnings = collectHardCollisionWarnings(bindings)
    expect(warnings).toHaveLength(1)
    expect(warnings[0]?.kind).toBe('hard')
    expect(warnings[0]?.chordHash).toBe('cmd+space')
    expect(warnings[0]?.apps).toEqual(['release-amethyst', 'release-macos'])
  })

  it('dedupes symmetric pairs', () => {
    const bindings = [
      globalRef({ bindingId: 'a:1', app: 'release-macos', action: 'Release Spotlight' }),
      globalRef({ bindingId: 'b:1', app: 'release-amethyst', action: 'Release Spotlight' }),
      globalRef({ bindingId: 'c:1', app: 'release-clash-e2e', action: 'Release Clash E2E' })
    ]
    expect(collectHardCollisionWarnings(bindings)).toHaveLength(3)
  })

  it('ignores soft cross-app local overlaps', () => {
    const bindings = [
      factoryFor('bindingRef', {
        overrides: { bindingId: 'a:1', app: 'vscode', scope: 'local', chordHash: 'cmd+p', action: 'Go To File' }
      }),
      factoryFor('bindingRef', {
        overrides: { bindingId: 'b:1', app: 'browser', scope: 'local', chordHash: 'cmd+p', action: 'Print' }
      })
    ]
    expect(collectHardCollisionWarnings(bindings)).toHaveLength(0)
  })
})

describe('formatHardCollisionWarning()', () => {
  it('names chord hash, apps, and kind', () => {
    const message = formatHardCollisionWarning({
      kind: 'hard',
      chordHash: 'cmd+space',
      apps: ['release-amethyst', 'release-macos'],
      actions: ['Release Spotlight', 'Release Spotlight']
    })
    expect(message).toContain('hard collision')
    expect(message).toContain('cmd+space')
    expect(message).toContain('release-macos')
    expect(message).toContain('release-amethyst')
  })
})

describe('hardCollisionWarningMessages()', () => {
  it('returns formatted strings', () => {
    const bindings = [
      globalRef({ bindingId: 'a:1', app: 'release-macos', action: 'Release Spotlight' }),
      globalRef({ bindingId: 'b:1', app: 'release-amethyst', action: 'Release Spotlight' })
    ]
    expect(hardCollisionWarningMessages(bindings)).toEqual([
      'hard collision: cmd+space between release-amethyst and release-macos (Release Spotlight / Release Spotlight)'
    ])
  })
})
