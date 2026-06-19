import type { Display } from 'electrobun/bun'

import { normalizeRectangle, type WindowFrame } from './placement.util'

/**
 * All native Y flips use the **primary display** bounds.
 *
 * macOS maps window frames into the primary display's Cocoa coordinate space across
 * the virtual desktop. Per-monitor height flips misplace shorter built-in panels
 * (native=237 read as y≈855 in 1692px space). Taller secondaries may drift by
 * `(taller.height - primary.height)` after switching monitors — corrected by
 * {@link applyNativeFrameWithCalibration}.
 */
export function screenFrameToNativeFrame(screenFrame: WindowFrame, _display: Display, primary: Display): WindowFrame {
  const primaryBounds = normalizeRectangle(primary.bounds)
  if (!primaryBounds) return screenFrame

  return {
    x: screenFrame.x,
    y: primaryBounds.y + primaryBounds.height - screenFrame.y - screenFrame.height,
    width: screenFrame.width,
    height: screenFrame.height
  }
}

/** Inverse of {@link screenFrameToNativeFrame}. */
export function nativeFrameToScreenFrame(nativeFrame: WindowFrame, _display: Display, primary: Display): WindowFrame {
  const primaryBounds = normalizeRectangle(primary.bounds)
  if (!primaryBounds) return nativeFrame

  return {
    x: nativeFrame.x,
    y: primaryBounds.y + primaryBounds.height - nativeFrame.y - nativeFrame.height,
    width: nativeFrame.width,
    height: nativeFrame.height
  }
}

export function adaptFrameForNativeWindow(
  screenFrame: WindowFrame,
  platform: NodeJS.Platform,
  display: Display,
  primary: Display
): WindowFrame {
  if (platform !== 'darwin') return screenFrame
  return screenFrameToNativeFrame(screenFrame, display, primary)
}

export function adaptPositionForNativeWindow(
  screenPosition: { x: number; y: number },
  platform: NodeJS.Platform,
  display: Display,
  primary: Display,
  windowHeight: number
): { x: number; y: number } {
  if (platform !== 'darwin') return screenPosition
  const primaryBounds = normalizeRectangle(primary.bounds)
  if (!primaryBounds) return screenPosition
  return {
    x: screenPosition.x,
    y: primaryBounds.y + primaryBounds.height - screenPosition.y - windowHeight
  }
}

export function adaptPositionFromNativeWindow(
  nativePosition: { x: number; y: number },
  platform: NodeJS.Platform,
  display: Display,
  primary: Display,
  windowHeight: number
): { x: number; y: number } {
  if (platform !== 'darwin') return nativePosition
  const primaryBounds = normalizeRectangle(primary.bounds)
  if (!primaryBounds) return nativePosition
  return {
    x: nativePosition.x,
    y: primaryBounds.y + primaryBounds.height - nativePosition.y - windowHeight
  }
}

const CALIBRATION_TOLERANCE_PX = 2
const MAX_CALIBRATION_ATTEMPTS = 5

/** Set native frame; retry when `getFrame` reports a screen Y drift after monitor switches. */
export function applyNativeFrameWithCalibration(
  win: {
    setFrame: (x: number, y: number, width: number, height: number) => void
    getFrame?: () => WindowFrame
  },
  targetScreen: WindowFrame,
  display: Display,
  primary: Display,
  platform: NodeJS.Platform
): WindowFrame | null {
  if (platform !== 'darwin') {
    win.setFrame(targetScreen.x, targetScreen.y, targetScreen.width, targetScreen.height)
    return null
  }

  let native = screenFrameToNativeFrame(targetScreen, display, primary)
  const { width, height } = targetScreen

  for (let attempt = 0; attempt < MAX_CALIBRATION_ATTEMPTS; attempt++) {
    win.setFrame(native.x, native.y, width, height)
    if (!win.getFrame) return native

    const actualNative = win.getFrame()
    const actualScreen = nativeFrameToScreenFrame(actualNative, display, primary)
    const dx = targetScreen.x - actualScreen.x
    const dy = targetScreen.y - actualScreen.y

    if (Math.abs(dx) < CALIBRATION_TOLERANCE_PX && Math.abs(dy) < CALIBRATION_TOLERANCE_PX) {
      return actualNative
    }

    native = { x: native.x + dx, y: native.y - dy, width, height }
  }

  return win.getFrame?.() ?? native
}
