import { beforeAll, describe, expect, it, mock } from 'bun:test'

let utilsClipboardReadText: () => string | null
let utilsClipboardWriteText: (text: string) => void

beforeAll(() => {
  mock.module('electrobun/bun', () => ({
    Utils: {
      clipboardReadText: () => utilsClipboardReadText(),
      clipboardWriteText: (text: string) => {
        utilsClipboardWriteText(text)
      }
    }
  }))
})

describe('clipboard.port', () => {
  describe('readSystemClipboard', () => {
    describe('when Utils.clipboardReadText returns text', () => {
      it('returns that text', async () => {
        utilsClipboardReadText = () => 'hello'
        const { readSystemClipboard } = await import('./clipboard.port')
        expect(readSystemClipboard()).toBe('hello')
      })
    })

    describe('when Utils.clipboardReadText returns null', () => {
      it('returns empty string', async () => {
        utilsClipboardReadText = () => null
        const { readSystemClipboard } = await import('./clipboard.port')
        expect(readSystemClipboard()).toBe('')
      })
    })

    describe('when Utils.clipboardReadText throws', () => {
      it('returns empty string on bridge error', async () => {
        utilsClipboardReadText = () => {
          throw new Error('bridge unavailable')
        }
        const { readSystemClipboard } = await import('./clipboard.port')
        expect(readSystemClipboard()).toBe('')
      })
    })
  })

  describe('writeSystemClipboard', () => {
    it('calls Utils.clipboardWriteText with the exact string', async () => {
      let written = ''
      utilsClipboardWriteText = (text: string) => {
        written = text
      }
      const { writeSystemClipboard } = await import('./clipboard.port')
      writeSystemClipboard('test payload')
      expect(written).toBe('test payload')
    })

    describe('when Utils.clipboardWriteText throws', () => {
      it('does not propagate the error', async () => {
        utilsClipboardWriteText = () => {
          throw new Error('bridge unavailable')
        }
        const { writeSystemClipboard } = await import('./clipboard.port')
        expect(() => writeSystemClipboard('test')).not.toThrow()
      })
    })
  })
})
