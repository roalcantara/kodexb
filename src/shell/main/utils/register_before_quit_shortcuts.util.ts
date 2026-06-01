import type { TeardownEvents, TeardownShortcuts } from './register_before_quit_shortcut_teardown.types'

export function registerBeforeQuitShortcutTeardown(events: TeardownEvents, shortcuts: TeardownShortcuts): void {
  events.on('before-quit', () => shortcuts.unregisterAll())
}
