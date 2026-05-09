/// <reference lib="dom" />

import { afterEach, expect, test } from 'bun:test'

import { blurDescendantsKeepingRoot, focusListSurface } from './list_surface_focus.util'

afterEach(() => {
  document.body.innerHTML = ''
})

test('blurDescendantsKeepingRoot blurs focused child inside root', () => {
  document.body.innerHTML = `
    <div id="root">
      <button type="button" id="btn">row</button>
    </div>
  `
  const root = document.getElementById('root')
  const btn = document.getElementById('btn') as HTMLButtonElement
  if (root === null || btn === null) throw new Error('missing fixture')
  btn.focus()
  expect(document.activeElement).toBe(btn)
  blurDescendantsKeepingRoot(root)
  expect(document.activeElement).toBe(document.body)
})

test('focusListSurface blurs nested focus then focuses root', () => {
  document.body.innerHTML = `<div id="surf" tabindex="0"><button type="button" id="b">x</button></div>`
  const surf = document.getElementById('surf') as HTMLDivElement
  const b = document.getElementById('b') as HTMLButtonElement
  if (surf === null || b === null) throw new Error('missing fixture')
  b.focus()
  const ref = { current: surf }
  focusListSurface(ref)
  expect(document.activeElement).toBe(surf)
})
