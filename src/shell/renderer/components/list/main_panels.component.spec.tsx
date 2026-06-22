import { describe, expect, it } from 'bun:test'
import { ListMainPanels } from './main_panels.component'

describe('ListMainPanels', () => {
  it('is exported for ListMain shell composition', () => {
    expect(typeof ListMainPanels).toBe('function')
    expect(ListMainPanels.name).toBe('ListMainPanels')
  })
})
