import { describe, expect, it } from 'bun:test'
import { findUnmanifestedTops, topLevelFromTracked } from './layout_validate.script'

describe('layout_validate.script', () => {
  it('topLevelFromTracked collects second path segment', () => {
    const tops = topLevelFromTracked([
      'packages/ops/src/governance/registries/catalog/catalog.script.ts',
      'packages/ops/src/bin/test.script.ts',
      'packages/ops/src/tools.manifest.toml'
    ])
    expect(tops.has('governance')).toBe(true)
    expect(tops.has('bin')).toBe(true)
    expect(tops.has('tools.manifest.toml')).toBe(true)
  })

  it('findUnmanifestedTops flags unknown folders', () => {
    const manifest = new Set(['bin', 'governance'])
    const tops = new Set(['governance', 'orphan'])
    expect(findUnmanifestedTops(manifest, tops)).toEqual(['unmanifested packages/ops/src/orphan/'])
  })

  it('findUnmanifestedTops allows packages/ops/src/__tests__', () => {
    const manifest = new Set(['bin', 'governance'])
    const tops = new Set(['governance', '__tests__'])
    expect(findUnmanifestedTops(manifest, tops)).toEqual([])
  })
})
