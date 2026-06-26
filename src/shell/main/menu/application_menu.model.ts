import type { ApplicationMenuItemConfig, MessageBoxOptions, MessageBoxResponse } from 'electrobun/bun'

export type ApplicationMenuItem = ApplicationMenuItemConfig

export type ApplicationMenuDeps = {
  version: string
  configPath: string
  showMessageBox: (opts: MessageBoxOptions) => Promise<MessageBoxResponse>
  openConfigInEditor: (path: string) => void
}

/** macOS app menu + Edit + Window (Linux application menus are unsupported upstream). */
export function buildApplicationMenu(): ApplicationMenuItemConfig[] {
  return [
    {
      submenu: [
        { label: 'About kb', action: 'about' },
        { type: 'separator' },
        { label: 'Settings…', action: 'open-settings', accelerator: ',' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'showAll' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'pasteAndMatchStyle' },
        { role: 'delete' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'zoom' }, { role: 'close' }]
    }
  ]
}

export async function handleApplicationMenuAction(action: string, deps: ApplicationMenuDeps): Promise<void> {
  if (action === 'about') {
    await deps.showMessageBox({
      type: 'info',
      title: 'About kb',
      message: `Version ${deps.version}`,
      buttons: ['OK']
    })
    return
  }

  if (action === 'open-settings') {
    deps.openConfigInEditor(deps.configPath)
  }
}
