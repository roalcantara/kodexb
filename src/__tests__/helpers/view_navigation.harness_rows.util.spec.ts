import { describe, expect, it } from 'bun:test'
import { viewNavBookmarkRow } from './view_navigation.harness_rows.util'

describe('view_navigation.harness_rows.util', () => {
  it('builds bookmark rows with stable keys', () => {
    expect(viewNavBookmarkRow(1).id).toBe(1)
    expect(viewNavBookmarkRow(1).key).toBe('k1')
  })
})
