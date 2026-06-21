// @entry_action_handoff
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test'
import {
  installBunDollarMock,
  installBunSpawnSyncMock,
  resetBunDollarMock,
  setBunDollarThrow,
  setBunSpawnSyncResult,
  uninstallBunDollarMock,
  uninstallBunSpawnSyncMock
} from '@testing'
import type { HandoffKind } from './handoff_registry.service'

let clipboardContent = ''
let openPathResult: boolean | 'throw' = false
let openExternalResult: boolean | 'throw' = false

function installHandoffRegistrySpecMocks(): void {
  mock.module('electrobun/bun', () => ({
    Utils: {
      openExternal: () => {
        if (openExternalResult === 'throw') throw new Error('openExternal failed')
        return openExternalResult
      },
      openPath: () => {
        if (openPathResult === 'throw') throw new Error('openPath failed')
        return openPathResult
      }
    }
  }))
  mock.module('./electrobun_clipboard.port', () => ({
    readSystemClipboard: () => clipboardContent,
    writeSystemClipboard: (text: string) => {
      clipboardContent = text
    }
  }))
}

beforeAll(() => installBunDollarMock())
beforeEach(() => {
  mock.restore()
  installHandoffRegistrySpecMocks()
  clipboardContent = ''
  openPathResult = false
  openExternalResult = false
  resetBunDollarMock()
  setBunDollarThrow(true)
  /** No known browser in front — forces openExternal path without mock.module leakage. */
  installBunSpawnSyncMock({ stdout: Buffer.from(''), stderr: Buffer.alloc(0), exitCode: 0 })
})
afterEach(() => {
  uninstallBunSpawnSyncMock()
})
afterAll(() => {
  mock.restore()
  uninstallBunDollarMock()
})

/** Registry specs assert osascript/Bun.$ behaviour; pin darwin so Linux CI does not require xdotool. */
const HANDOFF_TEST_PLATFORM = 'darwin' as const

const makeServices = () => {
  const calls: string[] = []
  return {
    calls,
    armGuard: () => {
      calls.push('armGuard')
    },
    disarmGuard: () => {
      calls.push('disarmGuard')
    },
    hide: () => {
      calls.push('hide')
    },
    show: () => {
      calls.push('show')
    }
  }
}

describe('runEntryHandoff', () => {
  describe('when browser-open has no url', () => {
    it('returns false with browser-open-failed code', async () => {
      clipboardContent = 'clip'
      const { runEntryHandoff } = await import('./handoff_registry.service')
      const services = makeServices()
      const result = runEntryHandoff('browser-open', {}, services, HANDOFF_TEST_PLATFORM)
      expect(result).toEqual({ ok: false, error: 'No URL provided', code: 'browser-open-failed' })
    })

    it('calls hide, show, and disarmGuard', async () => {
      const { runEntryHandoff } = await import('./handoff_registry.service')
      const services = makeServices()
      runEntryHandoff('browser-open', {}, services, HANDOFF_TEST_PLATFORM)
      expect(services.calls).toContain('hide')
      expect(services.calls).toContain('show')
      expect(services.calls).toContain('disarmGuard')
    })
  })

  describe('when editor-open has no filePath', () => {
    it('returns false with editor-open-failed code', async () => {
      const { runEntryHandoff } = await import('./handoff_registry.service')
      const services = makeServices()
      const result = runEntryHandoff('editor-open', {}, services, HANDOFF_TEST_PLATFORM)
      expect(result).toEqual({ ok: false, error: 'No file path provided', code: 'editor-open-failed' })
    })
  })

  describe('when terminal-paste with cmd succeeds', () => {
    it('restores clipboard and returns ok:true', async () => {
      clipboardContent = 'original-clip'
      setBunDollarThrow(false)
      const { runEntryHandoff } = await import('./handoff_registry.service')
      const services = makeServices()
      const result = runEntryHandoff('terminal-paste', { cmd: 'ls -la' }, services, HANDOFF_TEST_PLATFORM)

      expect(result).toEqual({ ok: true })
      expect(services.calls).toContain('disarmGuard')
      expect(services.calls).toContain('hide')
      expect(services.calls).not.toContain('show')
      expect(clipboardContent).toBe('original-clip')
    })
  })

  describe('when terminal-paste with cmd fails', () => {
    it('restores clipboard and returns error with terminal-paste-failed code', async () => {
      clipboardContent = 'original-clip'
      setBunDollarThrow(true)
      const { runEntryHandoff } = await import('./handoff_registry.service')
      const services = makeServices()
      const result = runEntryHandoff('terminal-paste', { cmd: 'ls -la' }, services, HANDOFF_TEST_PLATFORM)

      expect(result).toMatchObject({ ok: false, code: 'terminal-paste-failed' })
      expect(clipboardContent).toBe('original-clip')
      expect(services.calls).toContain('hide')
      expect(services.calls).toContain('show')
      expect(services.calls).toContain('disarmGuard')
    })
  })

  describe('when terminal-run with cmd succeeds', () => {
    it('restores clipboard and returns ok:true', async () => {
      clipboardContent = 'clip'
      setBunDollarThrow(false)
      const { runEntryHandoff } = await import('./handoff_registry.service')
      const services = makeServices()
      const result = runEntryHandoff('terminal-run', { cmd: 'npm test' }, services, HANDOFF_TEST_PLATFORM)

      expect(result).toEqual({ ok: true })
      expect(clipboardContent).toBe('clip')
      expect(services.calls).toContain('disarmGuard')
    })
  })

  describe('paste-frontmost tests', () => {
    describe('when paste-frontmost with doc succeeds', () => {
      it('restores clipboard and returns ok:true', async () => {
        clipboardContent = 'original-clip'
        setBunDollarThrow(false)
        setBunSpawnSyncResult({ exitCode: 0, stdout: '', stderr: '' })
        const { runEntryHandoff } = await import('./handoff_registry.service')
        const services = makeServices()
        const result = runEntryHandoff('paste-frontmost', { doc: 'paste-content' }, services, HANDOFF_TEST_PLATFORM)

        expect(result).toEqual({ ok: true })
        expect(clipboardContent).toBe('original-clip')
        expect(services.calls).toContain('hide')
        expect(services.calls).toContain('disarmGuard')
        expect(services.calls).not.toContain('show')
      })
    })

    describe('when paste-frontmost with doc fails', () => {
      it('restores clipboard and returns paste-doc-failed code', async () => {
        clipboardContent = 'original-clip'
        setBunDollarThrow(true)
        const { runEntryHandoff } = await import('./handoff_registry.service')
        const services = makeServices()
        const result = runEntryHandoff('paste-frontmost', { doc: 'paste-content' }, services, HANDOFF_TEST_PLATFORM)

        expect(result).toMatchObject({ ok: false, code: 'paste-doc-failed' })
        expect(clipboardContent).toBe('original-clip')
        expect(services.calls).toContain('show')
      })
    })
  })

  describe('when hide throws after clipboard write', () => {
    it('restores clipboard before showing and disarming', async () => {
      clipboardContent = 'original-clip'
      const { runEntryHandoff } = await import('./handoff_registry.service')
      const throwingHide = {
        calls: [] as string[],
        armGuard: () => { throwingHide.calls.push('armGuard') },
        disarmGuard: () => { throwingHide.calls.push('disarmGuard') },
        hide: () => { throwingHide.calls.push('hide'); throw new Error('hide crashed') },
        show: () => { throwingHide.calls.push('show') }
      }
      const result = runEntryHandoff('terminal-paste', { cmd: 'ls -la' }, throwingHide, HANDOFF_TEST_PLATFORM)

      expect(result).toBeDefined()
      expect(clipboardContent).toBe('original-clip')
    })
  })

  describe('when adapter succeeds', () => {
    it('disarms guard and returns ok:true', async () => {
      openExternalResult = true
      const { runEntryHandoff } = await import('./handoff_registry.service')
      const services = makeServices()
      const result = runEntryHandoff('browser-open', { url: 'https://example.com' }, services, HANDOFF_TEST_PLATFORM)

      expect(result).toEqual({ ok: true })
      expect(services.calls).toContain('armGuard')
      expect(services.calls).toContain('hide')
      expect(services.calls).toContain('disarmGuard')
      expect(services.calls).not.toContain('show')
    })
  })

  describe('when adapter returns ok:false after hide', () => {
    it('calls show and returns browser-open-failed code', async () => {
      clipboardContent = 'clip'
      const { runEntryHandoff } = await import('./handoff_registry.service')
      const services = makeServices()
      const result = runEntryHandoff('browser-open', { url: 'https://example.com' }, services, HANDOFF_TEST_PLATFORM)

      expect(result).toMatchObject({ ok: false, code: 'browser-open-failed' })
      expect(services.calls).toContain('hide')
      expect(services.calls).toContain('show')
      expect(services.calls).toContain('disarmGuard')
      expect(clipboardContent).toBe('clip')
    })
  })

  describe('error codes', () => {
    const cases: { kind: HandoffKind; payload: Record<string, string>; wantCode: string; wantError: string }[] = [
      {
        kind: 'browser-open',
        payload: { url: 'https://x.com' },
        wantCode: 'browser-open-failed',
        wantError: 'openExternal'
      },
      { kind: 'editor-open', payload: { filePath: '/tmp/x' }, wantCode: 'editor-open-failed', wantError: 'openPath' },
      {
        kind: 'terminal-paste',
        payload: { cmd: 'ls' },
        wantCode: 'terminal-paste-failed',
        wantError: 'Error: osascript failed'
      },
      {
        kind: 'terminal-run',
        payload: { cmd: 'npm test' },
        wantCode: 'terminal-run-failed',
        wantError: 'Error: osascript failed'
      },
      {
        kind: 'paste-frontmost',
        payload: { doc: 'test' },
        wantCode: 'paste-doc-failed',
        wantError: 'Error: osascript failed'
      }
    ]

    for (const { kind, payload, wantCode, wantError } of cases) {
      it(`returns "${wantCode}" for ${kind} with error matching "${wantError}"`, async () => {
        clipboardContent = ''
        const { runEntryHandoff } = await import('./handoff_registry.service')
        const services = makeServices()
        const result = runEntryHandoff(kind, payload, services, HANDOFF_TEST_PLATFORM)
        expect(result).toMatchObject({ ok: false, code: wantCode })
        expect(result).toMatchObject({ error: expect.stringContaining(wantError) })
      })
    }
  })
})
