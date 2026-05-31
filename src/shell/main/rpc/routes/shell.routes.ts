import { Elysia } from 'elysia'

import type { App } from '../../../app/app'
import {
  emptyBodySchema,
  getWindowPositionSchema,
  hideWindowSchema,
  openExternalSchema,
  resizeWindowSchema,
  setWindowPositionSchema,
  showOpenDialogSchema
} from '../schemas'

export function shellRoutes(app: App) {
  return new Elysia({ name: 'shell.routes' })
    .post('/showOpenDialog', ({ body }) => app.showOpenDialog(body.opts), {
      body: showOpenDialogSchema
    })
    .post('/fetchPreviewImage', ({ body }) => app.fetchPreviewImage(body.url), {
      body: openExternalSchema
    })
    .post('/resizeWindow', ({ body }) => app.resizeWindow(body.width, body.height), {
      body: resizeWindowSchema
    })
    .post('/getWindowPosition', () => app.getWindowPosition(), { body: getWindowPositionSchema })
    .post('/setWindowPosition', ({ body }) => app.setWindowPosition(body.x, body.y), {
      body: setWindowPositionSchema
    })
    .post('/hideWindow', () => app.hideWindow(), { body: hideWindowSchema })
    .post('/quit', () => app.quit(), { body: emptyBodySchema })
}
