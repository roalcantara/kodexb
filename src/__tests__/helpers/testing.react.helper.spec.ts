import { describe, expect, it } from 'bun:test'

import { expectViewState, fireArrowKey, fireTwoRightsExpectSplitThenDetail } from './testing.react.helper'

describe('testing.react.helper', () => {
  it('exports list navigation test helpers', () => {
    expect(typeof fireTwoRightsExpectSplitThenDetail).toBe('function')
    expect(typeof expectViewState).toBe('function')
    expect(typeof fireArrowKey).toBe('function')
  })
})
