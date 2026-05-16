/// <reference lib="dom" />
import { expect, test } from 'bun:test'
import { renderHook } from '@testing-library/react'
import { useRef } from 'react'

import { useCompactFilterOverlayFocus } from './use_compact_filter_overlay_focus.hook'

test('useCompactFilterOverlayFocus mounts without throwing', () => {
  const { result } = renderHook(() => useRef<HTMLInputElement>(null))
  expect(() => renderHook(() => useCompactFilterOverlayFocus(result.current))).not.toThrow()
})
