import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { setBunDollarThrow, setupBunDollarMock } from '@testing'

setupBunDollarMock()

const nonDarwinMessage = 'Paste frontmost requires macOS or Linux'

describe('pasteIntoFrontmostApp()', () => {
  describe('when platform is darwin', () => {
    describe('when Bun.$ succeeds', () => {
      it('returns ok:true', async () => {
        const { pasteIntoFrontmostApp } = await import('./paste_frontmost_handoff.util')
        expect(pasteIntoFrontmostApp('darwin')).toEqual({ ok: true })
      })
    })

    describe('when Bun.$ throws', () => {
      it('returns error with thrown message', async () => {
        setBunDollarThrow(true)
        const { pasteIntoFrontmostApp } = await import('./paste_frontmost_handoff.util')
        expect(pasteIntoFrontmostApp('darwin')).toEqual({ ok: false, error: 'Error: osascript failed' })
      })
    })
  })

  describe('linux', () => {
    let origBunSpawn: typeof Bun.spawnSync

    beforeEach(() => {
      origBunSpawn = Bun.spawnSync
    })
    afterEach(() => {
      Bun.spawnSync = origBunSpawn
    })

    it('returns ok:true when xdotool is available', async () => {
      Bun.spawnSync = (() => ({ exitCode: 0, stdout: '', stderr: '' })) as unknown as typeof Bun.spawnSync
      const { pasteIntoFrontmostApp } = await import('./paste_frontmost_handoff.util')
      expect(pasteIntoFrontmostApp('linux')).toEqual({ ok: true })
    })

    it('returns error about xdotool requirement when xdotool is not available', async () => {
      setBunDollarThrow(true)
      const { pasteIntoFrontmostApp } = await import('./paste_frontmost_handoff.util')
      expect(pasteIntoFrontmostApp('linux')).toEqual({
        ok: false,
        error: 'xdotool not found: install xdotool to enable Linux paste'
      })
    })

    it('returns error about key failure when xdotool exits non-zero', async () => {
      Bun.spawnSync = (() => ({
        exitCode: 1,
        stdout: '',
        stderr: 'No such window'
      })) as unknown as typeof Bun.spawnSync
      const { pasteIntoFrontmostApp } = await import('./paste_frontmost_handoff.util')
      expect(pasteIntoFrontmostApp('linux')).toMatchObject({ ok: false })
      expect(pasteIntoFrontmostApp('linux')).toMatchObject({ error: expect.stringContaining('xdotool key failed') })
    })
  })

  describe('when platform is neither darwin nor linux', () => {
    const expectedError = { ok: false as const, error: nonDarwinMessage }
    it('returns error about macOS or Linux requirement', async () => {
      const { pasteIntoFrontmostApp } = await import('./paste_frontmost_handoff.util')
      expect(pasteIntoFrontmostApp('win32')).toEqual(expectedError)
    })
  })
})
