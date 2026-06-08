import { describe, expect, it } from 'bun:test'
import { findUnmanifestedTops, topLevelFromTracked } from './layout_validate.script.ts'

describe('layout_validate.script', () => {
  it('topLevelFromTracked collects second path segment', () => {
    const tops = topLevelFromTracked([
      'tools/governance/registries/catalog/catalog.script.ts',
      'tools/bin/test.script.ts',
      'tools/tools.manifest.toml'
    ])
    expect(tops.has('governance')).toBe(true)
    expect(tops.has('bin')).toBe(true)
    expect(tops.has('tools.manifest.toml')).toBe(true)
  })

  it('findUnmanifestedTops flags unknown folders', () => {
    const manifest = new Set(['bin', 'governance'])
    const tops = new Set(['governance', 'orphan'])
    expect(findUnmanifestedTops(manifest, tops)).toEqual(['unmanifested tools/orphan/'])
  })

  it('findUnmanifestedTops allows tools/__tests__', () => {
    const manifest = new Set(['bin', 'governance'])
    const tops = new Set(['governance', '__tests__'])
    expect(findUnmanifestedTops(manifest, tops)).toEqual([])
  })
})
