import { afterEach, describe, expect, it } from 'bun:test'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { createRef } from 'react'

import {
  blurDescendantsKeepingRoot,
  collectTabOrderedFocusables,
  focusListSurface,
  listPageFocusRingElements,
  listSearchTypeaheadAction
} from './list_keyboard.util'

describe('listPageTabRing', () => {
  describe('collectTabOrderedFocusables', () => {
    describe('when root has focusable children', () => {
      it('returns nodes in document order', () => {
        const root = document.createElement('div')
        root.innerHTML = '<button type="button">a</button><input type="text" /><a href="#">x</a>'
        const els = collectTabOrderedFocusables(root)
        expect(els.map(e => e.tagName)).toEqual(['BUTTON', 'INPUT', 'A'])
      })
    })
  })

  describe('listPageFocusRingElements', () => {
    describe('with filter and detail open', () => {
      it('appends detail and filter focusables', () => {
        const listPage = document.createElement('div')
        listPage.innerHTML = `
        <button type="button" id="filter">filter</button>
        <input id="search" type="text" />
        <button type="button" id="sync">sync</button>
        <button type="button" id="settings">settings</button>
        <div id="list" tabindex="0">list</div>
        <aside class="kb-detailPanel kb-detailPanel--visible">
          <button type="button" id="detailBtn">detail-btn</button>
        </aside>
        <div class="kb-filterStack">
          <button type="button" id="backdrop">backdrop</button>
          <section class="kb-filterDrop"><input id="filterQ" type="text" /></section>
        </div>
      `

        const filterButtonRef = createRef<HTMLButtonElement>()
        const searchInputRef = createRef<HTMLInputElement>()
        const syncButtonRef = createRef<HTMLButtonElement>()
        const settingsButtonRef = createRef<HTMLButtonElement>()
        const listSurfaceRef = createRef<HTMLDivElement>()

        filterButtonRef.current = listPage.querySelector('#filter')
        searchInputRef.current = listPage.querySelector('#search')
        syncButtonRef.current = listPage.querySelector('#sync')
        settingsButtonRef.current = listPage.querySelector('#settings')
        listSurfaceRef.current = listPage.querySelector('#list')

        const chain = listPageFocusRingElements(
          {
            filterButtonRef,
            searchInputRef,
            syncButtonRef,
            settingsButtonRef,
            listSurfaceRef
          },
          { listPageRoot: listPage, filterOpen: true, detailOpen: true }
        )

        const ids = chain.map(el => el.id)
        expect(ids).toEqual(['filter', 'search', 'sync', 'settings', 'list', 'detailBtn', 'backdrop', 'filterQ'])
      })
    })
  })
})

describe('listSearchTypeahead', () => {
  function mockEv(
    partial: Partial<{ key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean; isComposing: boolean }>
  ): ReactKeyboardEvent<HTMLElement> {
    const isComposing = partial.isComposing ?? false
    return {
      key: partial.key ?? '',
      ctrlKey: partial.ctrlKey ?? false,
      metaKey: partial.metaKey ?? false,
      altKey: partial.altKey ?? false,
      nativeEvent: { isComposing } as globalThis.KeyboardEvent
    } as ReactKeyboardEvent<HTMLElement>
  }

  describe('when composing or with modifier', () => {
    it('returns none while composing', () => {
      expect(listSearchTypeaheadAction(mockEv({ key: 'a', isComposing: true }))).toEqual({ type: 'none' })
    })

    it('returns none with modifier keys', () => {
      expect(listSearchTypeaheadAction(mockEv({ key: 'a', ctrlKey: true }))).toEqual({ type: 'none' })
      expect(listSearchTypeaheadAction(mockEv({ key: 'a', metaKey: true }))).toEqual({ type: 'none' })
      expect(listSearchTypeaheadAction(mockEv({ key: 'a', altKey: true }))).toEqual({ type: 'none' })
    })
  })

  describe('with Backspace', () => {
    it('maps to backspace action', () => {
      expect(listSearchTypeaheadAction(mockEv({ key: 'Backspace' }))).toEqual({ type: 'backspace' })
    })
  })

  describe('with single-character keys', () => {
    it('maps to append action', () => {
      expect(listSearchTypeaheadAction(mockEv({ key: 'x' }))).toEqual({ type: 'append', char: 'x' })
      expect(listSearchTypeaheadAction(mockEv({ key: ' ' }))).toEqual({ type: 'append', char: ' ' })
    })
  })

  describe('with navigation or Enter', () => {
    it('returns none', () => {
      expect(listSearchTypeaheadAction(mockEv({ key: 'ArrowDown' }))).toEqual({ type: 'none' })
      expect(listSearchTypeaheadAction(mockEv({ key: 'Enter' }))).toEqual({ type: 'none' })
      expect(listSearchTypeaheadAction(mockEv({ key: 'Escape' }))).toEqual({ type: 'none' })
    })
  })
})

describe('listSurfaceFocus', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  describe('blurDescendantsKeepingRoot', () => {
    describe('when child inside root has focus', () => {
      it('blurs descendants only', () => {
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
    })
  })

  describe('focusListSurface', () => {
    describe('when nested element has focus', () => {
      it('moves focus to root', () => {
        document.body.innerHTML = `<div id="surf" tabindex="0"><button type="button" id="b">x</button></div>`
        const surf = document.getElementById('surf') as HTMLDivElement
        const b = document.getElementById('b') as HTMLButtonElement
        if (surf === null || b === null) throw new Error('missing fixture')
        b.focus()
        const ref = { current: surf }
        focusListSurface(ref)
        expect(document.activeElement).toBe(surf)
      })
    })
  })
})
