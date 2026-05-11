import { useEffect } from 'react'

/** Full ⌘K action palette (V1-8) deferred; stub only avoids browser chrome hijacking ⌘K. */
export function useListPageCmdKeyStub() {
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
