import { describe, expect, it } from 'bun:test'

import { fireTwoRightsExpectSplitThenDetail } from './testing.react.helper'

describe('fireTwoRightsExpectSplitThenDetail', () => {
  it('is exported for list / view-navigation hook specs', () => {
    expect(typeof fireTwoRightsExpectSplitThenDetail).toBe('function')
  })
})
