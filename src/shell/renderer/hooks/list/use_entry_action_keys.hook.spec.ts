import '@happy-dom/global-registrator'

import { afterEach, describe, expect, it } from 'bun:test'
import { targetOwnsEnter } from './use_entry_action_keys.hook'

function setup(html: string): HTMLElement {
  document.body.innerHTML = html
  const el = document.body.firstElementChild
  if (!(el instanceof HTMLElement)) throw new Error('expected HTMLElement')
  return el
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('targetOwnsEnter()', () => {
  it('returns true when target is inside the shortcut keymap', () => {
    const root = setup('<div class="cmp-shortcut-keymap"><button class="cmp-keymap-row">Go</button></div>')
    const btn = root.querySelector('button')
    expect(targetOwnsEnter(btn)).toBe(true)
  })

  it('returns true when target is inside the chord detail body', () => {
    const root = setup('<section class="cmp-chord-detail"><button>back</button></section>')
    const btn = root.querySelector('button')
    expect(targetOwnsEnter(btn)).toBe(true)
  })

  it('returns false when target is a list row outside the keymap surfaces', () => {
    const root = setup('<div><button class="cmp-list-row">List row</button></div>')
    const btn = root.querySelector('button')
    expect(targetOwnsEnter(btn)).toBe(false)
  })

  it('returns false for null or non-Element targets', () => {
    expect(targetOwnsEnter(null)).toBe(false)
    expect(targetOwnsEnter(window as unknown as EventTarget)).toBe(false)
  })
})
