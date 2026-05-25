import { describe, expect, it } from 'bun:test'
import { renderHook } from '@testing-library/react'
import { useRef } from 'react'

import { useCompactFilterOverlayFocus } from './use_compact_filter_overlay_focus.hook'

describe('useCompactFilterOverlayFocus', () => {
  describe('when hook mounts', () => {
    it('does not throw', () => {
      const { result } = renderHook(() => useRef<HTMLInputElement>(null))
      expect(() => renderHook(() => useCompactFilterOverlayFocus(result.current))).not.toThrow()
    })
  })
})
