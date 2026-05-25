import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, render } from '@testing-library/react'

const getWindowPosition = mock<() => Promise<{ x: number; y: number } | null>>()
const setWindowPosition = mock<(x: number, y: number) => Promise<void>>()

mock.module('../../rpc/client', () => ({
  getWindowPosition,
  setWindowPosition
}))

const { useWindowDrag } = await import('./use_window_drag.hook')

function Harness() {
  const { onMouseDown } = useWindowDrag()
  return <div role="presentation" aria-hidden onMouseDown={onMouseDown} />
}

type RafTask = () => void

type RafQueue = {
  drain: () => void
  restore: () => void
}

function installRafQueue(): RafQueue {
  const tasks: Array<{ id: number; fn: RafTask; cancelled: boolean }> = []
  let nextId = 1
  const prevRaf = globalThis.requestAnimationFrame
  const prevCaf = globalThis.cancelAnimationFrame
  globalThis.requestAnimationFrame = ((fn: RafTask) => {
    const id = nextId++
    tasks.push({ id, fn, cancelled: false })
    return id
  }) as typeof requestAnimationFrame
  globalThis.cancelAnimationFrame = ((id: number) => {
    const t = tasks.find(item => item.id === id)
    if (t) t.cancelled = true
  }) as typeof cancelAnimationFrame
  const drain = () => {
    const snapshot = tasks.splice(0, tasks.length)
    for (const t of snapshot) if (!t.cancelled) t.fn()
  }
  const restore = () => {
    globalThis.requestAnimationFrame = prevRaf
    globalThis.cancelAnimationFrame = prevCaf
  }
  return { drain, restore }
}

function mouseDown(target: EventTarget, screen: { x: number; y: number }, button = 0): void {
  // jsdom synthesises MouseEvent without `screenX/screenY` propagation; React
  // reads them from the underlying event, so we set them post-construction.
  const event = new MouseEvent('mousedown', { bubbles: true, button })
  Object.defineProperty(event, 'screenX', { value: screen.x })
  Object.defineProperty(event, 'screenY', { value: screen.y })
  target.dispatchEvent(event)
}

function mouseMove(screen: { x: number; y: number }): void {
  const event = new MouseEvent('mousemove', { bubbles: true })
  Object.defineProperty(event, 'screenX', { value: screen.x })
  Object.defineProperty(event, 'screenY', { value: screen.y })
  document.dispatchEvent(event)
}

function mouseUp(): void {
  document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
}

/**
 * Awaits all pending `getWindowPosition` promises so the hook's `.then`
 * branch runs before the test asserts. Swallows rejections — the hook
 * does the same.
 */
function flushPendingDragSetup(): Promise<unknown> {
  const pending = getWindowPosition.mock.results.map(r => r.value)
  return Promise.allSettled(pending)
}

async function startDrag(screen: { x: number; y: number }): Promise<HTMLElement> {
  const { container } = render(<Harness />)
  const stripe = container.firstChild as HTMLElement
  mouseDown(stripe, screen)
  await flushPendingDragSetup()
  return stripe
}

describe('useWindowDrag', () => {
  let raf: ReturnType<typeof installRafQueue>

  beforeEach(() => {
    raf = installRafQueue()
    getWindowPosition.mockReset()
    setWindowPosition.mockReset()
    setWindowPosition.mockResolvedValue(undefined)
  })

  afterEach(() => {
    cleanup()
    raf.restore()
  })

  describe('when the primary mouse button starts a drag', () => {
    it('moves the window by the screen-cursor delta on the next animation frame', async () => {
      getWindowPosition.mockResolvedValue({ x: 100, y: 200 })
      await startDrag({ x: 50, y: 60 })
      mouseMove({ x: 70, y: 90 })
      raf.drain()
      expect(setWindowPosition).toHaveBeenCalledWith(120, 230)
    })

    it('coalesces multiple mousemoves into a single rAF call', async () => {
      getWindowPosition.mockResolvedValue({ x: 0, y: 0 })
      await startDrag({ x: 0, y: 0 })
      mouseMove({ x: 1, y: 1 })
      mouseMove({ x: 2, y: 2 })
      mouseMove({ x: 3, y: 3 })
      raf.drain()
      expect(setWindowPosition).toHaveBeenCalledTimes(1)
      expect(setWindowPosition).toHaveBeenLastCalledWith(3, 3)
    })

    it('stops listening after mouseup', async () => {
      getWindowPosition.mockResolvedValue({ x: 0, y: 0 })
      await startDrag({ x: 0, y: 0 })
      mouseUp()
      mouseMove({ x: 50, y: 50 })
      raf.drain()
      expect(setWindowPosition).not.toHaveBeenCalled()
    })
  })

  describe('when the mouse button is not primary', () => {
    it('does not start a drag', () => {
      const { container } = render(<Harness />)
      mouseDown(container.firstChild as HTMLElement, { x: 0, y: 0 }, 2)
      expect(getWindowPosition).not.toHaveBeenCalled()
    })
  })

  describe('when the native window is unavailable', () => {
    it('silently skips the drag', async () => {
      getWindowPosition.mockResolvedValue(null)
      await startDrag({ x: 0, y: 0 })
      mouseMove({ x: 100, y: 100 })
      raf.drain()
      expect(setWindowPosition).not.toHaveBeenCalled()
    })
  })

  describe('when the RPC rejects on the initial getWindowPosition', () => {
    it('swallows the error and never moves the window', async () => {
      getWindowPosition.mockRejectedValue(new Error('rpc down'))
      await startDrag({ x: 0, y: 0 })
      mouseMove({ x: 50, y: 50 })
      raf.drain()
      expect(setWindowPosition).not.toHaveBeenCalled()
    })
  })
})
