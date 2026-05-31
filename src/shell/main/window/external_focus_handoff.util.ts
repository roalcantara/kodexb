export type ExternalFocusHandoff = {
  shouldDeferBlurMinimize: () => boolean
  armGuard: () => void
  disarmGuard: () => void
}

export type ExternalFocusHandoffOptions = {
  hide: () => void
  show: () => void
  guardMs?: number
  now?: () => number
}

/** Blur guard must cover the full handoff; retreat runs near the end. */
const DEFAULT_FOCUS_GUARD_MS = 900

export function createExternalFocusHandoff(options: ExternalFocusHandoffOptions): ExternalFocusHandoff {
  const guardMs = options.guardMs ?? DEFAULT_FOCUS_GUARD_MS
  const now = options.now ?? (() => Date.now())
  let guardUntil = 0

  return {
    shouldDeferBlurMinimize: () => now() < guardUntil,
    armGuard() {
      guardUntil = now() + guardMs
    },
    disarmGuard() {
      guardUntil = 0
    }
  }
}
