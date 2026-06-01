import { describe, expect, it } from 'bun:test'
import { bindingRefsForApps, bindingsCacheSample, factoryFor } from '@testing'

describe('testing.bindings.util', () => {
  it('builds the bindings cache sample', () => {
    const sample = bindingsCacheSample()
    expect(sample).toHaveLength(3)
    expect(sample[0]?.bindingId).toBe('b1')
  })

  it('builds binding refs for apps on one chord hash', () => {
    const refs = bindingRefsForApps('ctrl+a', [{ app: 'VS Code', scope: 'global' }])
    expect(refs[0]?.chordHash).toBe('ctrl+a')
    expect(refs[0]?.app).toBe('VS Code')
  })
})

describe('bindingRef factory', () => {
  it('builds defaults', () => {
    const ref = factoryFor('bindingRef')
    expect(ref.bindingId).toContain('app-')
    expect(ref.scope).toBe('local')
  })

  it('builds global variant', () => {
    const ref = factoryFor('bindingRef:global')
    expect(ref.scope).toBe('global')
    expect(ref.chordHash).toBe('cmd+space')
  })
})

describe('binding factory', () => {
  it('builds go-to-file preset', () => {
    const binding = factoryFor('binding:goToFile')
    expect(binding.action).toBe('Go to File')
    expect(binding.id).toBe('go-to-file')
  })
})

describe('shortcut:vscodeKeymap factory', () => {
  it('includes vscode bindings', () => {
    const entry = factoryFor('shortcut:vscodeKeymap')
    expect(entry.key).toBe('vscode')
    expect(entry.bindings.some(b => b.action === 'Go to File')).toBe(true)
  })
})
