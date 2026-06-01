// pattern: Functional Core

import { describe, expect, it } from 'bun:test'
import { bindingRefFixture, factoryFor } from '@testing'
import { classifyAll, detect } from './collision.detector'

describe('detect', () => {
  describe('global × any other', () => {
    it('detects hard collision when both are global', () => {
      const a = factoryFor('bindingRef:global', { overrides: { bindingId: 'test:id', chordHash: 'cmd+p' } })
      const b = factoryFor('bindingRef:global', { overrides: { bindingId: 'other', chordHash: 'cmd+p' } })
      expect(detect(a, [b])).toEqual([{ kind: 'hard', against: b, reason: 'global-x-any' }])
    })
  })

  describe('local × local same app', () => {
    it('detects hard collision', () => {
      const a = factoryFor('bindingRef', { overrides: { scope: 'local', app: 'vscode', chordHash: 'ctrl+s' } })
      const b = factoryFor('bindingRef', {
        overrides: { bindingId: 'other', scope: 'local', app: 'vscode', chordHash: 'ctrl+s' }
      })
      expect(detect(a, [b])).toEqual([{ kind: 'hard', against: b, reason: 'local-same-app' }])
    })
  })

  describe('local × local different app', () => {
    it('detects soft collision', () => {
      const a = factoryFor('bindingRef', { overrides: { scope: 'local', app: 'vscode', chordHash: 'ctrl+p' } })
      const b = factoryFor('bindingRef', {
        overrides: { bindingId: 'other', scope: 'local', app: 'terminal', chordHash: 'ctrl+p' }
      })
      expect(detect(a, [b])).toEqual([{ kind: 'soft', against: b, reason: 'cross-app-local' }])
    })
  })

  describe('global × local different app', () => {
    it('detects soft collision', () => {
      const a = bindingRefFixture({ scope: 'global', app: 'os', chordHash: 'cmd+space' })
      const b = bindingRefFixture({ bindingId: 'other', scope: 'local', app: 'spotlight', chordHash: 'cmd+space' })
      const result = detect(a, [b])
      expect(result).toEqual([{ kind: 'soft', against: b, reason: 'global-x-local-cross-app' }])
    })
  })

  describe('disjoint platforms', () => {
    it('detects no collision', () => {
      const a = bindingRefFixture({ platform: 'macos', chordHash: 'ctrl+c' })
      const b = bindingRefFixture({ bindingId: 'other', platform: 'linux', chordHash: 'ctrl+c' })
      expect(detect(a, [b])).toEqual([])
    })
  })

  describe('any platform overlaps everything', () => {
    it('detects collision when candidate is any', () => {
      const a = bindingRefFixture({ platform: 'any', scope: 'global', chordHash: 'cmd+v' })
      const b = bindingRefFixture({ bindingId: 'other', platform: 'macos', chordHash: 'cmd+v' })
      expect(detect(a, [b])).toHaveLength(1)
    })

    it('detects collision when existing is any', () => {
      const a = bindingRefFixture({ platform: 'windows', scope: 'global', chordHash: 'cmd+v' })
      const b = bindingRefFixture({ bindingId: 'other', platform: 'any', chordHash: 'cmd+v' })
      expect(detect(a, [b])).toHaveLength(1)
    })
  })

  describe('sequence-shadow', () => {
    it('detects hard when candidate prefix matches existing single-step', () => {
      const a = bindingRefFixture({
        bindingId: 'seq',
        scope: 'global',
        chordHash: 'ctrl+k>ctrl+s',
        chordPrefix: 'ctrl+k'
      })
      const b = bindingRefFixture({
        bindingId: 'single',
        scope: 'global',
        chordHash: 'ctrl+k',
        chordPrefix: null
      })
      expect(detect(a, [b])).toEqual([{ kind: 'hard', against: b, reason: 'sequence-shadow' }])
    })

    it('detects hard when single-step matches existing sequence prefix', () => {
      const a = bindingRefFixture({
        bindingId: 'single',
        scope: 'global',
        chordHash: 'ctrl+k',
        chordPrefix: null
      })
      const b = bindingRefFixture({
        bindingId: 'seq',
        scope: 'global',
        chordHash: 'ctrl+k>ctrl+s',
        chordPrefix: 'ctrl+k'
      })
      expect(detect(a, [b])).toEqual([{ kind: 'hard', against: b, reason: 'sequence-shadow' }])
    })
  })

  describe('no collision', () => {
    it('returns empty for different chord hashes and no prefix overlap', () => {
      const a = bindingRefFixture({ chordHash: 'ctrl+a' })
      const b = bindingRefFixture({ bindingId: 'other', chordHash: 'ctrl+b' })
      expect(detect(a, [b])).toEqual([])
    })

    it('returns empty for same binding id (self)', () => {
      const a = bindingRefFixture({ bindingId: 'me' })
      const b = bindingRefFixture({ bindingId: 'me' })
      expect(detect(a, [b])).toEqual([])
    })
  })

  describe('global × local same app', () => {
    it('detects no collision (local overrides global in same app)', () => {
      const a = bindingRefFixture({ scope: 'global', app: 'vscode', chordHash: 'ctrl+p' })
      const b = bindingRefFixture({ bindingId: 'other', scope: 'local', app: 'vscode', chordHash: 'ctrl+p' })
      expect(detect(a, [b])).toEqual([])
    })
  })
})

describe('classifyAll', () => {
  it('returns empty map when no collisions exist', () => {
    const refs = [
      bindingRefFixture({ bindingId: 'a', chordHash: 'ctrl+a' }),
      bindingRefFixture({ bindingId: 'b', chordHash: 'ctrl+b' })
    ]
    expect(classifyAll(refs).size).toBe(0)
  })

  it('returns collisions for conflicting bindings', () => {
    const refs = [
      bindingRefFixture({ bindingId: 'a', scope: 'global', chordHash: 'cmd+p' }),
      bindingRefFixture({ bindingId: 'b', scope: 'global', chordHash: 'cmd+p' })
    ]
    const map = classifyAll(refs)
    expect(map.size).toBe(2)
    expect(map.get('a')).toHaveLength(1)
    expect(map.get('b')).toHaveLength(1)
  })

  it('handles three-way collision', () => {
    const refs = [
      bindingRefFixture({ bindingId: 'a', scope: 'global', chordHash: 'ctrl+o' }),
      bindingRefFixture({ bindingId: 'b', scope: 'global', chordHash: 'ctrl+o' }),
      bindingRefFixture({ bindingId: 'c', scope: 'global', chordHash: 'ctrl+o' })
    ]
    const map = classifyAll(refs)
    expect(map.size).toBe(3)
    for (const collisions of map.values()) {
      expect(collisions).toHaveLength(2)
    }
  })
})
