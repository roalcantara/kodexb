import { useCallback, useEffect, useRef } from 'react'
import { getWindowPosition, setWindowPosition } from '../../rpc/client'

const PRIMARY_MOUSE_BUTTON = 0

type DragSession = {
  startMouse: { x: number; y: number }
  startWin: { x: number; y: number }
  latestMouse: { x: number; y: number }
  rafId: number | null
}

type ActiveDrag = {
  session: DragSession
  move: (event: MouseEvent) => void
  up: () => void
}

const noop = (): undefined => undefined

/**
 * Window-drag hook for the chromeless desktop shell. The native NSWindow drag
 * region is unavailable when `titleBarStyle: 'hidden'` (see
 * `src/shell/main/shell_hooks.util.ts`), so the renderer drives drag itself
 * over RPC: capture screen-cursor delta on mousedown, coalesce mousemove to
 * `requestAnimationFrame`, fire-and-forget `setWindowPosition` per frame.
 *
 * Behavior:
 *
 * - Only the primary (left) mouse button starts a drag.
 * - Drag is silently skipped when `getWindowPosition()` resolves to `null`
 *   (no native window — preview server, tests).
 * - All move-time RPC calls are fire-and-forget; errors are swallowed because
 *   the next move will overwrite the position anyway.
 */
export function useWindowDrag(): { onMouseDown: (event: React.MouseEvent) => void } {
  const activeRef = useRef<ActiveDrag | null>(null)

  const onMouseDown = useCallback((event: React.MouseEvent) => {
    if (event.button !== PRIMARY_MOUSE_BUTTON) return
    event.preventDefault()
    const startMouse = { x: event.screenX, y: event.screenY }
    getWindowPosition()
      .then(win => {
        if (!win) return
        const session: DragSession = {
          startMouse,
          startWin: win,
          latestMouse: startMouse,
          rafId: null
        }
        const flush = (): undefined => {
          if (activeRef.current?.session !== session) return
          session.rafId = null
          const dx = session.latestMouse.x - session.startMouse.x
          const dy = session.latestMouse.y - session.startMouse.y
          setWindowPosition(Math.round(session.startWin.x + dx), Math.round(session.startWin.y + dy)).catch(noop)
        }
        const move = (e: MouseEvent): undefined => {
          session.latestMouse = { x: e.screenX, y: e.screenY }
          if (session.rafId !== null) return
          session.rafId = requestAnimationFrame(flush)
        }
        const up = (): undefined => {
          if (session.rafId !== null) cancelAnimationFrame(session.rafId)
          activeRef.current = null
          document.removeEventListener('mousemove', move)
          document.removeEventListener('mouseup', up)
        }
        activeRef.current = { session, move, up }
        document.addEventListener('mousemove', move)
        document.addEventListener('mouseup', up)
      })
      .catch(noop)
  }, [])

  // Defensive: tear down any in-flight drag if the host unmounts mid-drag.
  // The drag stripe lives in the persistent app shell, so this is unlikely
  // to fire in practice.
  useEffect(
    () => () => {
      const active = activeRef.current
      if (!active) return
      if (active.session.rafId !== null) cancelAnimationFrame(active.session.rafId)
      document.removeEventListener('mousemove', active.move)
      document.removeEventListener('mouseup', active.up)
      activeRef.current = null
    },
    []
  )

  return { onMouseDown }
}
