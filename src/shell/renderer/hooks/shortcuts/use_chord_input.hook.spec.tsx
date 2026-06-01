import { describe, expect, it } from 'bun:test'
import { renderHook } from '@testing-library/react'
import { useChordInput } from './use_chord_input.hook'

describe('useChordInput', () => {
  it('detects empty input as text mode', () => {
    const { result } = renderHook(() => useChordInput(''))
    expect(result.current.mode).toBe('text')
  })

  it('detects plain text as text mode', () => {
    const { result } = renderHook(() => useChordInput('go to file'))
    expect(result.current.mode).toBe('text')
  })

  it('detects chord-like input as chord mode', () => {
    const { result } = renderHook(() => useChordInput('cmd+p'))
    expect(result.current.mode).toBe('chord')
  })

  it('detects glyph chord as chord mode', () => {
    const { result } = renderHook(() => useChordInput('\u2318P'))
    expect(result.current.mode).toBe('chord')
  })
})
