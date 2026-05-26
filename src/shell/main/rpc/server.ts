import { rpcCommonPlugins } from '@shared/logging'
import { Elysia } from 'elysia'

import type { App } from '../../app/app'
import {
  configPatchSchema,
  emptyBodySchema,
  getEntryParams,
  getWindowPositionSchema,
  hideWindowSchema,
  idWithDirSchema,
  idWithReorderDirSchema,
  listOptsSchema,
  listStatsFilterSchema,
  openExternalSchema,
  openInEditorSchema,
  pasteInTerminalSchema,
  resizeWindowSchema,
  setWindowPositionSchema,
  showOpenDialogSchema,
  suggestTagsSchema,
  syncInfoSchema,
  syncParamsInner,
  taskCreateSchema,
  taskUpdateSchema
} from './schemas'

/**
 * Single source of truth for the main ↔ renderer transport contract.
 *
 * Routes are POST `/api/<method>` with TypeBox-validated JSON bodies. Each
 * handler delegates to `App` and returns a JSON-serialisable value.
 *
 * The error contract (`{ error: string }`/HTTP 500 envelope) and the request
 * lifecycle logger ship together via `rpcCommonPlugins`; the preview server
 * mounts the same bundle so renderer ↔ main and preview share one transport.
 */
export function createRpcServer(appInstance: App) {
  return new Elysia({ prefix: '/api' })
    .use(rpcCommonPlugins)
    .post('/list', ({ body }) => appInstance.list(body), { body: listOptsSchema })
    .post('/listMatchCount', ({ body }) => appInstance.listMatchCount(body), { body: listOptsSchema })
    .post('/getListStats', ({ body }) => appInstance.getListStats(body), { body: listStatsFilterSchema })
    .post('/getEntry', ({ body }) => appInstance.getEntry(body.id), { body: getEntryParams })
    .post('/recordEntryVisit', ({ body }) => appInstance.recordEntryVisit(body.id), { body: getEntryParams })
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
    .post('/getWindowPosition', () => appInstance.getWindowPosition(), { body: getWindowPositionSchema })
    .post('/setWindowPosition', ({ body }) => appInstance.setWindowPosition(body.x, body.y), {
      body: setWindowPositionSchema
    })
    .post('/hideWindow', () => appInstance.hideWindow(), { body: hideWindowSchema })
    .post('/quit', () => appInstance.quit(), { body: emptyBodySchema })
    .post('/getSyncInfo', () => appInstance.getSyncInfo(), { body: syncInfoSchema })
}

export type RpcApp = ReturnType<typeof createRpcServer>
