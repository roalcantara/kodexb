import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { installBunDollarMock, installElectrobunBunMock, uninstallBunDollarMock } from '@testing'

let openPathResult: boolean | 'throw' = true

function installEditorAdapterElectrobunMock(): void {
  installElectrobunBunMock({
    openPath: () => {
      if (openPathResult === 'throw') throw new Error('bridge error')
      return openPathResult
    }
  })
}

installEditorAdapterElectrobunMock()

beforeAll(() => installBunDollarMock())
afterAll(() => uninstallBunDollarMock())

describe('openInEditor()', () => {
  describe('when platform is darwin and editorApp is set', () => {
    it('returns ok:true', async () => {
      const { openInEditor } = await import('./editor.adapter')
      expect(openInEditor('/tmp/test.md', 'Code', 'darwin')).toEqual({ ok: true })
    })
  })

  describe('when platform is linux and editorApp is set', () => {
    let savedSpawn: typeof Bun.spawnSync
    beforeEach(() => {
      savedSpawn = Bun.spawnSync
    })
    afterEach(() => {
      Bun.spawnSync = savedSpawn
    })

    describe('when gtk-launch succeeds', () => {
      it('returns ok:true', async () => {
        Bun.spawnSync = (() => ({ exitCode: 0, stdout: '', stderr: '' })) as unknown as typeof Bun.spawnSync
        const { openInEditor } = await import('./editor.adapter')
        expect(openInEditor('/tmp/test.md', 'Code', 'linux')).toEqual({ ok: true })
      })
    })

    describe('when gtk-launch fails', () => {
      it('returns error about gtk-launch failure', async () => {
        Bun.spawnSync = (() => ({ exitCode: 1, stdout: '', stderr: 'not found' })) as unknown as typeof Bun.spawnSync
        const { openInEditor } = await import('./editor.adapter')
        expect(openInEditor('/tmp/test.md', 'Code', 'linux')).toEqual({
          ok: false,
          error: expect.stringContaining('gtk-launch')
        })
      })
    })
  })

  describe('when platform is unsupported with editorApp set', () => {
    it('returns error about unsupported platform', async () => {
      const { openInEditor } = await import('./editor.adapter')
      expect(openInEditor('/tmp/test.md', 'Code', 'win32')).toEqual({
        ok: false,
        error: expect.stringContaining('not supported on win32')
      })
    })
  })

  describe('when editorApp is unset', () => {
    describe('when Utils.openPath returns true', () => {
      it('returns ok:true', async () => {
        openPathResult = true
        const { openInEditor } = await import('./editor.adapter')
        expect(openInEditor('/tmp/test.md')).toEqual({ ok: true })
      })
    })

    describe('when Utils.openPath returns false', () => {
      it('returns error with openPath in message', async () => {
        openPathResult = false
        const { openInEditor } = await import('./editor.adapter')
        expect(openInEditor('/tmp/test.md')).toEqual({
          ok: false,
          error: expect.stringContaining('openPath')
        })
      })
    })

    describe('when Utils.openPath throws', () => {
      it('returns error with thrown message', async () => {
        openPathResult = 'throw'
        const { openInEditor } = await import('./editor.adapter')
        expect(openInEditor('/tmp/test.md')).toEqual({ ok: false, error: 'Error: bridge error' })
      })
    })
  })
})
