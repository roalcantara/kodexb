import type { Display } from 'electrobun/bun'

/**
 * Window drag RPC uses Screen top-left coordinates after the launcher window is
 * realized (same contract as {@link presentLauncherWindow} `setFrame`).
 */
export function adaptPositionForNativeWindow(
  screenPosition: { x: number; y: number },
  platform: NodeJS.Platform,
  _display: Display,
  _primary: Display,
  _windowHeight: number
): { x: number; y: number } {
  if (platform !== 'darwin') return screenPosition
  return screenPosition
}

export const adaptPositionFromNativeWindow = adaptPositionForNativeWindow
