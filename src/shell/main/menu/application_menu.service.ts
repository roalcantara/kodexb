import Electrobun, { ApplicationMenu } from 'electrobun/bun'
import {
  type ApplicationMenuDeps,
  type ApplicationMenuItem,
  buildApplicationMenu,
  handleApplicationMenuAction
} from './application_menu.model'

export type { ApplicationMenuDeps, ApplicationMenuItem } from './application_menu.model'
export { buildApplicationMenu, handleApplicationMenuAction } from './application_menu.model'

type ApplicationMenuRuntime = {
  setApplicationMenu: (menu: ApplicationMenuItem[]) => void
  onMenuClicked: (event: 'application-menu-clicked', handler: (event: { data: { action?: string } }) => void) => void
}

const defaultRuntime = (): ApplicationMenuRuntime => ({
  setApplicationMenu: menu => ApplicationMenu.setApplicationMenu(menu),
  onMenuClicked: (event, handler) => Electrobun.events.on(event, handler)
})

export function registerApplicationMenu(
  deps: ApplicationMenuDeps,
  platform: NodeJS.Platform = process.platform,
  runtime: ApplicationMenuRuntime = defaultRuntime()
): void {
  if (platform !== 'darwin') return

  runtime.setApplicationMenu(buildApplicationMenu())

  runtime.onMenuClicked('application-menu-clicked', event => {
    const action = event.data.action
    if (!action) return
    handleApplicationMenuAction(action, deps).catch(() => undefined)
  })
}
