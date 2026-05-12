import { Elysia } from 'elysia'

import type { App } from '../../app/app'
import {
  configPatchSchema,
  emptyBodySchema,
  getEntryParams,
  hideWindowSchema,
  idWithDirSchema,
  idWithReorderDirSchema,
  listOptsSchema,
  openExternalSchema,
  openInEditorSchema,
  pasteInTerminalSchema,
  resizeWindowSchema,
  showOpenDialogSchema,
  suggestTagsSchema,
  syncInfoSchema,
  syncParamsInner,
  taskCreateSchema,
  taskUpdateSchema
} from './schemas'

const HTTP_INTERNAL_ERROR = 500

/**
 * Elysia plugin: every uncaught error surfaces as `{ error: string }` with
 * HTTP 500 — matches preview behaviour and the pre-Elysia transport.
 * Exported so test fixtures can reuse the exact same contract without
 * duplicating the handler body.
 */
export const rpcErrorContract = new Elysia({ name: 'kb-rpc-error' }).onError({ as: 'global' }, ({ error, set }) => {
  const message = error instanceof Error ? error.message : String(error)
  set.status = HTTP_INTERNAL_ERROR
  return { error: message }
})

/**
 * Single source of truth for the main ↔ renderer transport contract.
 *
 * Routes are POST `/api/<method>` with TypeBox-validated JSON bodies. Each
 * handler delegates to `App` and returns a JSON-serialisable value.
 */
export function createRpcServer(appInstance: App) {
  return new Elysia({ prefix: '/api' })
    .use(rpcErrorContract)
    .post('/list', ({ body }) => appInstance.list(body), { body: listOptsSchema })
    .post('/getListStats', () => appInstance.getListStats(), { body: emptyBodySchema })
    .post('/getEntry', ({ body }) => appInstance.getEntry(body.id), { body: getEntryParams })
    .post('/sync', ({ body }) => appInstance.sync(body.sourcesDir), { body: syncParamsInner })
    .post('/getStats', () => appInstance.getStats(), { body: emptyBodySchema })
    .post('/getConfig', () => appInstance.getConfig(), { body: emptyBodySchema })
    .post('/saveConfig', ({ body }) => appInstance.applyConfigPatch(body), { body: configPatchSchema })
    .post('/createTask', ({ body }) => appInstance.createTask(body), { body: taskCreateSchema })
    .post('/updateTask', ({ body }) => appInstance.updateTask(body.id, body.patch), { body: taskUpdateSchema })
    .post('/deleteTask', ({ body }) => appInstance.deleteTask(body.id), { body: getEntryParams })
    .post('/cycleStatus', ({ body }) => appInstance.cycleStatus(body.id, body.dir), { body: idWithDirSchema })
    .post('/cyclePriority', ({ body }) => appInstance.cyclePriority(body.id, body.dir), { body: idWithDirSchema })
    .post('/reorderTask', ({ body }) => appInstance.reorderTask(body.id, body.dir), {
      body: idWithReorderDirSchema
    })
    .post('/openExternal', ({ body }) => appInstance.openExternal(body.url), { body: openExternalSchema })
    .post('/pasteInTerminal', ({ body }) => appInstance.pasteInTerminal(body.cmd), {
      body: pasteInTerminalSchema
    })
    .post('/openInEditor', ({ body }) => appInstance.openInEditor(body.filePath), {
      body: openInEditorSchema
    })
    .post('/showOpenDialog', ({ body }) => appInstance.showOpenDialog(body.opts), {
      body: showOpenDialogSchema
    })
    .post('/fetchPreviewImage', ({ body }) => appInstance.fetchPreviewImage(body.url), {
      body: openExternalSchema
    })
    .post('/suggestTags', ({ body }) => appInstance.suggestTags(body.entryId), { body: suggestTagsSchema })
    .post('/resizeWindow', ({ body }) => appInstance.resizeWindow(body.width, body.height), {
      body: resizeWindowSchema
    })
    .post('/hideWindow', () => appInstance.hideWindow(), { body: hideWindowSchema })
    .post('/getSyncInfo', () => appInstance.getSyncInfo(), { body: syncInfoSchema })
}

export type RpcApp = ReturnType<typeof createRpcServer>
