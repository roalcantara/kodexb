import { describe, expect, it, mock } from 'bun:test'
import type { ApplicationMenuDeps } from './application_menu.model'
import { registerApplicationMenu } from './application_menu.service'

function deps(overrides: Partial<ApplicationMenuDeps> = {}): ApplicationMenuDeps {
  return {
    version: '1.2.3',
    configPath: '/home/user/.config/kb/config.yaml',
    showMessageBox: mock(() => Promise.resolve({ response: 0 })),
    openConfigInEditor: mock(() => undefined),
    ...overrides
  }
}

describe('registerApplicationMenu', () => {
  it('is a no-op on linux', () => {
    const setApplicationMenu = mock(() => undefined)
    registerApplicationMenu(deps(), 'linux', { setApplicationMenu, onMenuClicked: mock(() => undefined) })
    expect(setApplicationMenu).not.toHaveBeenCalled()
  })

  it('registers menu on darwin', () => {
    const setApplicationMenu = mock(() => undefined)
    const onMenuClicked = mock(() => undefined)
    registerApplicationMenu(deps(), 'darwin', { setApplicationMenu, onMenuClicked })

    expect(setApplicationMenu).toHaveBeenCalledTimes(1)
    expect(onMenuClicked).toHaveBeenCalledWith('application-menu-clicked', expect.any(Function))
  })
})
