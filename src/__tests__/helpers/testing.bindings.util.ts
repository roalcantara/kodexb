import type { BindingRef } from '@shared/rpc'
import { factoryFor } from '../factories/factories.builder'

/** Three-binding set used by bindings cache hook specs (vscode locals + global print on cmd+p). */
export function bindingsCacheSample(): BindingRef[] {
  return [
    factoryFor('bindingRef', {
      overrides: {
        bindingId: 'b1',
        entryKey: 'e1',
        app: 'vscode',
        platform: 'macos',
        scope: 'local',
        chordHash: 'cmd+p',
        chordPrefix: null,
        action: 'Go to File'
      }
    }),
    factoryFor('bindingRef', {
      overrides: {
        bindingId: 'b2',
        entryKey: 'e1',
        app: 'vscode',
        platform: 'macos',
        scope: 'local',
        chordHash: 'cmd+shift+p',
        chordPrefix: 'cmd',
        action: 'Show All Commands'
      }
    }),
    factoryFor('bindingRef', {
      overrides: {
        bindingId: 'b3',
        entryKey: 'e2',
        app: 'system',
        platform: 'any',
        scope: 'global',
        chordHash: 'cmd+p',
        chordPrefix: null,
        action: 'Print'
      }
    })
  ]
}

/** Builds a binding ref with factory defaults; pass partial overrides for scenarios. */
export function bindingRefFixture(overrides: Partial<BindingRef> = {}): BindingRef {
  return factoryFor('bindingRef', { overrides })
}

/** Builds same-chord binding refs for collision / chord-detail scenarios. */
export function bindingRefsForApps(
  chordHash: string,
  apps: ReadonlyArray<{ app: string; scope: 'global' | 'local'; action?: string }>
): BindingRef[] {
  return apps.map((app, index) =>
    factoryFor('bindingRef', {
      overrides: {
        bindingId: `${app.app}:b${index}`,
        entryKey: 'entry',
        app: app.app,
        scope: app.scope,
        chordHash,
        chordPrefix: null,
        action: app.action ?? 'Select All'
      }
    })
  )
}
