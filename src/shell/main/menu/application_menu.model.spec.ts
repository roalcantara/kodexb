import { describe, expect, it, mock } from 'bun:test'
import type { ApplicationMenuItemConfig } from 'electrobun/bun'
import { type ApplicationMenuDeps, buildApplicationMenu, handleApplicationMenuAction } from './application_menu.model'

function isDivider(item: ApplicationMenuItemConfig): boolean {
  return item.type === 'divider' || item.type === 'separator'
}

function submenuOf(item: ApplicationMenuItemConfig | undefined): ApplicationMenuItemConfig[] {
  if (!item || isDivider(item) || !('submenu' in item)) return []
  return item.submenu ?? []
}

function appSubmenu(): ApplicationMenuItemConfig[] {
  return submenuOf(buildApplicationMenu()[0])
}

function deps(overrides: Partial<ApplicationMenuDeps> = {}): ApplicationMenuDeps {
  return {
    version: '1.2.3',
    configPath: '/home/user/.config/kb/config.yaml',
    showMessageBox: mock(() => Promise.resolve({ response: 0 })),
    openConfigInEditor: mock(() => undefined),
    ...overrides
  }
}

describe('buildApplicationMenu', () => {
  it('orders app items with separator after About', () => {
    const items = appSubmenu()
    expect(items[0]).toMatchObject({ label: 'About kb', action: 'about' })
    expect(items[1]).toEqual({ type: 'separator' })
    expect(items[2]).toMatchObject({
      label: 'Settings…',
      action: 'open-settings',
      accelerator: 'CmdOrCtrl+,'
    })
    expect(items[3]).toEqual({ type: 'separator' })
    expect(items[4]).toMatchObject({ role: 'hide' })
    expect(items[7]).toEqual({ type: 'separator' })
    expect(items[8]).toMatchObject({ role: 'quit' })
  })

  it('uses roles for hide and quit shortcuts (not inline labels)', () => {
    const items = appSubmenu()
    for (const item of items) {
      if (!isDivider(item) && 'role' in item && item.role) {
        expect(item.label).toBeUndefined()
        expect(item.accelerator).toBeUndefined()
      }
    }
  })

  it('includes Edit and Window menus with standard roles', () => {
    const menu = buildApplicationMenu()
    const editMenu = menu[1]
    const windowMenu = menu[2]
    expect(editMenu && !isDivider(editMenu) && 'label' in editMenu ? editMenu.label : undefined).toBe('Edit')
    expect(submenuOf(editMenu).some(item => !isDivider(item) && 'role' in item && item.role === 'copy')).toBe(true)
    expect(windowMenu && !isDivider(windowMenu) && 'label' in windowMenu ? windowMenu.label : undefined).toBe('Window')
    expect(submenuOf(windowMenu).some(item => !isDivider(item) && 'role' in item && item.role === 'minimize')).toBe(
      true
    )
  })
})

describe('handleApplicationMenuAction', () => {
  it('shows About dialog with version', async () => {
    const showMessageBox = mock(() => Promise.resolve({ response: 0 }))
    await handleApplicationMenuAction('about', deps({ version: '9.9.9', showMessageBox }))

    expect(showMessageBox).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'info',
        title: 'About kb',
        message: 'Version 9.9.9'
      })
    )
  })

  it('opens config path for Settings', async () => {
    const openConfigInEditor = mock(() => undefined)
    const configPath = '/tmp/config.yaml'
    await handleApplicationMenuAction('open-settings', deps({ configPath, openConfigInEditor }))

    expect(openConfigInEditor).toHaveBeenCalledWith(configPath)
  })
})
