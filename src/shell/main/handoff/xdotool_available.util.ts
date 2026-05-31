export function xdotoolAvailable(): boolean {
  try {
    Bun.$`which xdotool`.quiet().nothrow()
    return true
  } catch {
    return false
  }
}
