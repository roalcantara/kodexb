export type TeardownEvents = {
  on: (event: 'before-quit', handler: () => void) => void
}

export type TeardownShortcuts = {
  unregisterAll: () => void
}
