import { afterEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, render } from '@testing-library/react'
import { useRef } from 'react'
import { useListPointerSelection } from './use_list_pointer_selection.hook'

afterEach(() => {
  cleanup()
})

function PointerSelectionHarness({ active, onHoverEntry }: { active: boolean; onHoverEntry: (id: number) => void }) {
  const scrollRootRef = useRef<HTMLDivElement>(null)
  useListPointerSelection({ scrollRootRef, active, onHoverEntry })
  return (
    <div ref={scrollRootRef} data-testid="list" style={{ height: 80, overflow: 'auto' }}>
      <button type="button" data-entry-id="10">
        Row A
      </button>
      <button type="button" data-entry-id="20">
        Row B
      </button>
    </div>
  )
}

describe('useListPointerSelection', () => {
  it('selects the row under the pointer after scroll', () => {
    const onHoverEntry = mock((_id: number) => undefined)
    const { getByTestId } = render(<PointerSelectionHarness active onHoverEntry={onHoverEntry} />)
    const list = getByTestId('list')
    const rowB = list.querySelector('[data-entry-id="20"]') as HTMLButtonElement
    const fromPoint = mock(() => rowB)
    const previous = document.elementFromPoint
    document.elementFromPoint = fromPoint

    try {
      rowB.dispatchEvent(new PointerEvent('pointermove', { clientX: 50, clientY: 40, bubbles: true }))
      onHoverEntry.mockClear()
      list.dispatchEvent(new Event('scroll'))
      expect(onHoverEntry).toHaveBeenCalledWith(20)
    } finally {
      document.elementFromPoint = previous
    }
  })
})
