/// <reference lib="dom" />
import { expect, test } from 'bun:test'
import { renderHook } from '@testing-library/react'
import { useRef } from 'react'

import { useCompactFilterOverlayScroll } from './use_compact_filter_overlay_scroll.hook'

test('useCompactFilterOverlayScroll mounts without throwing', () => {
  const { result: scrollRef } = renderHook(() => useRef<HTMLDivElement>(null))
  const { result: inputRef } = renderHook(() => useRef<HTMLInputElement>(null))
  expect(() =>
    renderHook(() => useCompactFilterOverlayScroll(scrollRef.current, inputRef.current, 0, 'all'))
  ).not.toThrow()
})
