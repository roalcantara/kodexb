import { Elysia } from 'elysia'

import type { App } from '../../../app/app'
import {
  openExternalSchema,
  openInEditorSchema,
  pasteDocSchema,
  pasteInTerminalSchema,
  runInTerminalSchema
} from '../schemas'
import { invokeRoute } from './utils/invoke_route.util'

export function handoffRoutes(app: App) {
  return new Elysia({ name: 'handoff.routes' })
    .post('/openExternal', ({ body, set }) => invokeRoute(set, () => app.openExternal(body.url)), {
      body: openExternalSchema
    })
    .post('/pasteInTerminal', ({ body, set }) => invokeRoute(set, () => app.pasteInTerminal(body.cmd)), {
      body: pasteInTerminalSchema
    })
    .post('/runInTerminal', ({ body, set }) => invokeRoute(set, () => app.runInTerminal(body.cmd)), {
      body: runInTerminalSchema
    })
    .post('/pasteDoc', ({ body, set }) => invokeRoute(set, () => app.pasteDoc(body.doc)), {
      body: pasteDocSchema
    })
    .post('/openInEditor', ({ body, set }) => invokeRoute(set, () => app.openInEditor(body.filePath)), {
      body: openInEditorSchema
    })
}
