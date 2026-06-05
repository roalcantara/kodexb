import { describe, expect, it } from 'bun:test'
import { chooseRenderer } from './render_mode.ts'

describe('chooseRenderer', () => {
  it('json wins over tty', () => {
    expect(chooseRenderer({ json: true, raw: false, isTty: true })).toBe('json')
  })

  it('raw when non-tty', () => {
    expect(chooseRenderer({ json: false, raw: false, isTty: false })).toBe('raw')
  })

  it('pretty on tty by default', () => {
    expect(chooseRenderer({ json: false, raw: false, isTty: true })).toBe('pretty')
  })

  it('raw flag forces raw on tty', () => {
    expect(chooseRenderer({ json: false, raw: true, isTty: true })).toBe('raw')
  })
})
