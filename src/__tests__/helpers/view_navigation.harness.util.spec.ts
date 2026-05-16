import { describe, expect, it } from 'bun:test'
import { ViewNavKeyCapture, viewNavBookmarkRow } from './view_navigation.harness.util'

describe('view_navigation.harness.util', () => {
  it('exports viewNavBookmarkRow helper', () => {
    expect(viewNavBookmarkRow(1).id).toBe(1)
  })

  it('exports ViewNavKeyCapture', () => {
    expect(typeof ViewNavKeyCapture).toBe('function')
  })
})
