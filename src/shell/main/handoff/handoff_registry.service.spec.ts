import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test'
import { installBunDollarMock, resetBunDollarMock, setBunDollarThrow, uninstallBunDollarMock } from '@testing'
import type { HandoffKind } from './handoff_registry.service'

let clipboardContent = ''
let openPathResult: boolean | 'throw' = false
let openExternalResult: boolean | 'throw' = false

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

beforeAll(() => installBunDollarMock())
beforeEach(() => {
  clipboardContent = ''
  openPathResult = false
  openExternalResult = false
  resetBunDollarMock()
  setBunDollarThrow(true)
})
afterAll(() => uninstallBunDollarMock())

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
    let restoreSpawn: typeof Bun.spawnSync
    beforeEach(() => {
      restoreSpawn = Bun.spawnSync
    })
    afterEach(() => {
      Bun.spawnSync = restoreSpawn
    })

    describe('when paste-frontmost with doc succeeds', () => {
      it('restores clipboard and returns ok:true', async () => {
        clipboardContent = 'original-clip'
        setBunDollarThrow(false)
        Bun.spawnSync = (() => ({ exitCode: 0, stdout: '', stderr: '' })) as unknown as typeof Bun.spawnSync
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

  describe('error codes', () => {
    const cases: { kind: HandoffKind; payload: Record<string, string>; wantCode: string; wantError: string }[] = [
      {
        kind: 'browser-open',
        payload: { url: 'https://x.com' },
        wantCode: 'browser-open-failed',
        wantError: 'openExternal'
      },
      { kind: 'editor-open', payload: { filePath: '/tmp/x' }, wantCode: 'editor-open-failed', wantError: 'openPath' },
      { kind: 'terminal-paste', payload: {}, wantCode: 'terminal-paste-failed', wantError: 'Error: osascript failed' },
      { kind: 'terminal-run', payload: {}, wantCode: 'terminal-run-failed', wantError: 'Error: osascript failed' },
      { kind: 'paste-frontmost', payload: {}, wantCode: 'paste-doc-failed', wantError: 'Error: osascript failed' }
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
