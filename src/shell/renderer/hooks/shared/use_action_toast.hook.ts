import { useCallback, useRef, useState } from 'react'

export type ActionToast = {
  id: number
  message: string
  type: 'success' | 'error'
}

let nextId = 0

const MAX_TOASTS = 4
const TOAST_DURATION_MS = 4000

export function useActionToast() {
  const [toasts, setToasts] = useState<ActionToast[]>([])
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const pushToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = nextId++
    setToasts(prev => {
      const next = [{ id, message, type }, ...prev]
      return next.slice(0, MAX_TOASTS)
    })
    const timer = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
      timersRef.current.delete(id)
    }, TOAST_DURATION_MS)
    timersRef.current.set(id, timer)
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
  }, [])

  return { toasts, pushToast, dismissToast }
}
