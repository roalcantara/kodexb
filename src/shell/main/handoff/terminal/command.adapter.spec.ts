import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { setBunDollarThrow, setupBunDollarMock } from '@testing'

setupBunDollarMock()

const nonDarwinMessage = 'Terminal handoff requires macOS or Linux'

for (const name of ['pasteInTerminal', 'runInTerminal'] as const) {
  describe(`${name}()`, () => {
    describe('when platform is darwin', () => {
      describe('when Bun.$ succeeds', () => {
        it('returns ok:true', async () => {
          const mod = await import('./command.adapter')
          expect(mod[name]('Terminal', 'darwin')).toEqual({ ok: true })
        })
      })

      describe('when Bun.$ throws', () => {
        it('returns error with thrown message', async () => {
          setBunDollarThrow(true)
          const mod = await import('./command.adapter')
          expect(mod[name]('Terminal', 'darwin')).toEqual({ ok: false, error: 'Error: osascript failed' })
        })
      })
    })

    describe('when platform is linux', () => {
      let savedSpawn: typeof Bun.spawnSync
      beforeEach(() => {
        savedSpawn = Bun.spawnSync
      })
      afterEach(() => {
        Bun.spawnSync = savedSpawn
      })

      describe('when xdotool is available', () => {
        it('returns ok:true', async () => {
          Bun.spawnSync = (() => ({ exitCode: 0, stdout: '', stderr: '' })) as unknown as typeof Bun.spawnSync
          const mod = await import('./command.adapter')
          expect(mod[name]('Terminal', 'linux')).toEqual({ ok: true })
        })
      })

      describe('when xdotool is not available', () => {
        it('returns error about xdotool requirement', async () => {
          setBunDollarThrow(true)
          const mod = await import('./command.adapter')
          expect(mod[name]('Terminal', 'linux')).toEqual({
            ok: false,
            error: 'xdotool not found: install xdotool to enable Linux terminal handoff'
          })
        })
      })
    })

    describe('when platform is neither darwin nor linux', () => {
      const expectedError = { ok: false as const, error: nonDarwinMessage }
      it('returns error about macOS or Linux requirement', async () => {
        const mod = await import('./command.adapter')
        expect(mod[name]('Terminal', 'win32')).toEqual(expectedError)
      })
    })
  })
}
