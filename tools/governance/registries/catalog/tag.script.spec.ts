import { describe, expect, it } from 'bun:test'
import type { TagResolution } from './tag.script.ts'
import { layerFilter, playwrightGrepPattern, splitTaggedPaths, unionResolutions } from './tag.script.ts'

describe('tag.lib', () => {
  it('splitTaggedPaths separates features and unit specs', () => {
    expect(
      splitTaggedPaths([
        'assets/features/e2e/command_palette.feature',
        'src/foo.component.spec.tsx',
        'src/bar.util.spec.ts'
      ])
    ).toEqual({
      features: ['assets/features/e2e/command_palette.feature'],
      units: ['src/bar.util.spec.ts', 'src/foo.component.spec.tsx']
    })
  })

  it('layerFilter defaults to both when neither flag set', () => {
    expect(layerFilter(false, false)).toEqual({ e2e: true, unit: true })
    expect(layerFilter(true, false)).toEqual({ e2e: true, unit: false })
  })

  it('unionResolutions dedupes paths and collects tags', () => {
    const a: TagResolution = {
      catalogId: 'a',
      entry: {},
      tag: '@a',
      features: ['assets/features/e2e/a.feature'],
      units: ['src/shared.spec.ts']
    }
    const b: TagResolution = {
      catalogId: 'b',
      entry: {},
      tag: '@b',
      features: ['assets/features/e2e/a.feature'],
      units: ['src/other.spec.ts']
    }
    expect(unionResolutions([a, b])).toEqual({
      features: ['assets/features/e2e/a.feature'],
      units: ['src/other.spec.ts', 'src/shared.spec.ts'],
      tags: ['@a', '@b']
    })
  })

  it('playwrightGrepPattern escapes regex metacharacters', () => {
    expect(playwrightGrepPattern(['@command_palette', '@sync'])).toBe('@command_palette|@sync')
  })
})
