import { describe, expect, it } from 'bun:test'
import { fireMutation } from './use_task_keyboard.hook'

function tick(): Promise<void> {
  return new Promise(r => setTimeout(r, 0))
}

describe('fireMutation', () => {
  describe('when the promise resolves with ok: false', () => {
    it('calls onMutationError with the message', async () => {
      let errorMsg = ''
      fireMutation(
        Promise.resolve({ ok: false, message: 'source_write_failed' }),
        msg => {
          errorMsg = msg
        },
        () => undefined
      )
      await tick()
      expect(errorMsg).toBe('source_write_failed')
    })
  })

  describe('when the promise resolves with ok: true', () => {
    it('does not call onMutationError', async () => {
      let called = false
      fireMutation(
        Promise.resolve({ ok: true, message: '' }),
        () => {
          called = true
        },
        () => undefined
      )
      await tick()
      expect(called).toBe(false)
    })
  })

  describe('when the promise rejects', () => {
    it('calls onMutationError with a fallback message', async () => {
      let errorMsg = ''
      fireMutation(
        Promise.reject(new Error('network error')),
        msg => {
          errorMsg = msg
        },
        () => undefined
      )
      await tick()
      expect(errorMsg).toBe('Task mutation failed')
    })

    it('still calls onRefresh', async () => {
      let refreshed = false
      fireMutation(Promise.reject(new Error('network error')), undefined, () => {
        refreshed = true
      })
      await tick()
      expect(refreshed).toBe(true)
    })
  })
})
