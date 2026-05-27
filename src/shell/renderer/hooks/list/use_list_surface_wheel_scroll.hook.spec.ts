import { afterEach, describe, expect, it } from 'bun:test'
import { cleanup, render } from '@testing-library/react'
import { createRef, useEffect } from 'react'
import { useListSurfaceWheelScroll } from './use_list_surface_wheel_scroll.hook'

afterEach(() => {
  cleanup()
})

function WheelHarness({ active }: { active: boolean }) {
  const scrollRootRef = createRef<HTMLDivElement>()

  useListSurfaceWheelScroll({ scrollRootRef, active })

  useEffect(() => {
    const root = scrollRootRef.current
    if (!root) return
    Object.defineProperty(root, 'clientHeight', { value: 100, configurable: true })
    Object.defineProperty(root, 'scrollHeight', { value: 400, configurable: true })
  }, [])

  return (
    <div>
      <input data-testid="search" />
      <div ref={scrollRootRef}
  data-testid = 'list'
  style={{ height: 100, overflow: 'auto' }
}
>
        <div style=
{
  height: 400
}
;/> < / > div < />div
)
}

describe('useListSurfaceWheelScroll', () =>
{
  describe('when active', () => {
    it('scrolls the list root for wheel events outside it', () => {
      render(<WheelHarness active />)
      const list = document.querySelector('[data-testid="list"]') as HTMLDivElement
      const search = document.querySelector('[data-testid="search"]') as HTMLInputElement
      list.scrollTop = 0

      search.dispatchEvent(new WheelEvent('wheel', { deltaY: 40, bubbles: true }))

      expect(list.scrollTop).toBe(40)
    })
  })

  describe('when inactive', () => {
    it('does not scroll the list root', () => {
      render(<WheelHarness active={false} />)
      const list = document.querySelector('[data-testid="list"]') as HTMLDivElement
      const search = document.querySelector('[data-testid="search"]') as HTMLInputElement
      list.scrollTop = 0

      search.dispatchEvent(new WheelEvent('wheel', { deltaY: 40, bubbles: true }))

      expect(list.scrollTop).toBe(0)
    })
  })
}
)
