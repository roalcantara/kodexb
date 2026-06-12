import { describe, expect, it } from 'bun:test'
import { catalogPaths } from './catalog_paths.util'

describe('catalogPaths', () => {
  it('loads specs_root from scan_paths.yaml', () => {
    expect(catalogPaths.specs_root.length).toBeGreaterThan(0)
    expect(Array.isArray(catalogPaths.scan_paths)).toBe(true)
  })
})
