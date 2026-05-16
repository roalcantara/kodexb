import { type RefObject, useEffect } from 'react'

export function useCompactFilterOverlayFocus(searchInputRef: RefObject<HTMLInputElement | null>): void {
  useEffect(() => {
    const t = setTimeout(() => searchInputRef.current?.focus(), 0)
    return () => clearTimeout(t)
  }, [searchInputRef])
}
