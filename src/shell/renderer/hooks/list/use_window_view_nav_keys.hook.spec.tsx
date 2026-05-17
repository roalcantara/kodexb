/// <reference lib="dom" />

import { describe, expect, it } from 'bun:test'
import { act, render, waitFor } from '@testing-library/react'
import { useState } from 'react'

import { useWindowViewNavKeys } from './use_window_view_nav_keys.hook'

describe('useWindowViewNavKeys', () => {
  function Harness({ disabled }: { disabled: boolean }) {
    const [hits, setHits] = useState(0)
    useWindowViewNavKeys({
      disabled,
      handleKey: e => {
        if (e.key === 'ArrowLeft') {
          e.preventDefault()
          setHits(h => h + 1)
        }
      }
    })
    return <span data-testid="hits">{hits}</span>
  }

  function EscapeHarness({ disabled, skipEscapeCapture }: { disabled: boolean; skipEscapeCapture?: boolean }) {
    const [hits, setHits] = useState(0)
    useWindowViewNavKeys({
      disabled,
      skipEscapeCapture,
      handleKey: e => {
        if (e.key === 'Escape') {
          e.preventDefault()
          setHits(h => h + 1)
        }
      }
    })
    return <span data-testid="escape-hits">{hits}</span>
  }

  function WindowCopyKeyHarness({ disabled }: { disabled: boolean }) {
    const [hits, setHits] = useState(0)
    useWindowViewNavKeys({
      disabled,
      handleKey: e => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
          e.preventDefault()
          setHits(h => h + 1)
        }
      }
    })
    return <span data-testid="copy-hits">{hits}</span>
  }

  function WindowSearchShortcutHarness({ disabled }: { disabled: boolean }) {
    const [shortcutHits, setShortcutHits] = useState(0)
    useWindowViewNavKeys({
      disabled,
      handleKey: () => undefined,
      handleModL: e => {
        e.preventDefault()
        setShortcutHits(h => h + 1)
      }
    })
    return <span data-testid="shortcut-hits">{shortcutHits}</span>
  }

  function ListArrowsHarness({ disabled }: { disabled: boolean }) {
    const [hits, setHits] = useState(0)
    useWindowViewNavKeys({
      disabled,
      handleKey: () => undefined,
      handleListArrows: () => {
        setHits(h => h + 1)
      }
    })
    return <span data-testid="list-arrow-hits">{hits}</span>
  }

  describe('with handleListArrows', () => {
    it('invokes handleListArrows for ArrowDown when not disabled', async () => {
      render(<ListArrowsHarness disabled={false} />)
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }))
      })
      await waitFor(() => {
        expect(document.querySelector('[data-testid="list-arrow-hits"]')?.textContent).toBe('1')
      })
    })

    it('skips handleListArrows when disabled', async () => {
      render(<ListArrowsHarness disabled />)
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      })
      await new Promise(r => setTimeout(r, 20))
      expect(document.querySelector('[data-testid="list-arrow-hits"]')?.textContent).toBe('0')
    })

    it('skips handleListArrows for Cmd+ArrowDown', async () => {
      render(<ListArrowsHarness disabled={false} />)
      act(() => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'ArrowDown', metaKey: true, bubbles: true, cancelable: true })
        )
      })
      await new Promise(r => setTimeout(r, 20))
      expect(document.querySelector('[data-testid="list-arrow-hits"]')?.textContent).toBe('0')
    })

    it('skips handleListArrows when target is search input', async () => {
      function InputHarness() {
        const [hits, setHits] = useState(0)
        useWindowViewNavKeys({
          disabled: false,
          handleKey: () => undefined,
          handleListArrows: () => setHits(h => h + 1)
        })
        return (
          <>
            <input data-testid="q" type="search" />
            <span data-testid="list-arrow-hits">{hits}</span>
          </>
        )
      }
      render(<InputHarness />)
      const input = document.querySelector('[data-testid="q"]') as HTMLInputElement
      input.focus()
      act(() => {
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }))
      })
      await new Promise(r => setTimeout(r, 20))
      expect(document.querySelector('[data-testid="list-arrow-hits"]')?.textContent).toBe('0')
    })
  })

  describe('with handleKey for ArrowLeft', () => {
    it('invokes handleKey when not disabled', async () => {
      render(<Harness disabled={false} />)
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
      })
      await waitFor(() => {
        expect(document.querySelector('[data-testid="hits"]')?.textContent).toBe('1')
      })
    })

    it('does not invoke handleKey when disabled', async () => {
      render(<Harness disabled />)
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
      })
      await new Promise(r => setTimeout(r, 20))
      expect(document.querySelector('[data-testid="hits"]')?.textContent).toBe('0')
    })
  })

  describe('with handleKey for Escape', () => {
    function dispatchWindowEscapeKey(): void {
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
      })
    }

    it('invokes handleKey when not disabled', async () => {
      render(<EscapeHarness disabled={false} />)
      dispatchWindowEscapeKey()
      await waitFor(() => {
        expect(document.querySelector('[data-testid="escape-hits"]')?.textContent).toBe('1')
      })
    })

    it('does not invoke handleKey when skipEscapeCapture', async () => {
      render(<EscapeHarness disabled={false} skipEscapeCapture />)
      dispatchWindowEscapeKey()
      await new Promise(r => setTimeout(r, 20))
      expect(document.querySelector('[data-testid="escape-hits"]')?.textContent).toBe('0')
    })

    it('invokes handleKey when skipEscapeCapture is false', async () => {
      render(<EscapeHarness disabled={false} skipEscapeCapture={false} />)
      dispatchWindowEscapeKey()
      await waitFor(() => {
        expect(document.querySelector('[data-testid="escape-hits"]')?.textContent).toBe('1')
      })
    })

    it('does not invoke handleKey when disabled', async () => {
      render(<EscapeHarness disabled />)
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      })
      await new Promise(r => setTimeout(r, 20))
      expect(document.querySelector('[data-testid="escape-hits"]')?.textContent).toBe('0')
    })
  })

  describe('with handleKey for Cmd+C', () => {
    it('invokes handleKey when not disabled', async () => {
      render(<WindowCopyKeyHarness disabled={false} />)
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', metaKey: true, bubbles: true, cancelable: true }))
      })
      await waitFor(() => {
        expect(document.querySelector('[data-testid="copy-hits"]')?.textContent).toBe('1')
      })
    })

    it('skips handleKey when disabled', async () => {
      render(<WindowCopyKeyHarness disabled />)
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', metaKey: true, bubbles: true }))
      })
      await new Promise(r => setTimeout(r, 20))
      expect(document.querySelector('[data-testid="copy-hits"]')?.textContent).toBe('0')
    })
  })

  describe('with handleModL for Cmd+L', () => {
    it('invokes handleModL when not disabled', async () => {
      render(<WindowSearchShortcutHarness disabled={false} />)
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'l', metaKey: true, bubbles: true, cancelable: true }))
      })
      await waitFor(() => {
        expect(document.querySelector('[data-testid="shortcut-hits"]')?.textContent).toBe('1')
      })
    })

    it('skips handleModL when disabled', async () => {
      render(<WindowSearchShortcutHarness disabled />)
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'l', metaKey: true, bubbles: true }))
      })
      await new Promise(r => setTimeout(r, 20))
      expect(document.querySelector('[data-testid="shortcut-hits"]')?.textContent).toBe('0')
    })
  })
})
