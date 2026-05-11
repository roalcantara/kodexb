import { Type } from '@sinclair/typebox'

import type { App } from '../../app/app'
import {
  configPatchSchema,
  dirSchema,
  getEntryParams,
  listOptsSchema,
  parseRpcPayload,
  reorderDirSchema,
  syncParamsInner,
  taskCreateSchema,
  taskUpdateSchema
} from './schemas'

const idWithDirSchema = Type.Object(
  {
    id: Type.Integer(),
    dir: dirSchema
  },
  { additionalProperties: false }
)

const idWithReorderDirSchema = Type.Object(
  {
    id: Type.Integer(),
    dir: reorderDirSchema
  },
  { additionalProperties: false }
)

const openExternalSchema = Type.Object({ url: Type.String({ minLength: 1 }) }, { additionalProperties: false })
const pasteInTerminalSchema = Type.Object({ cmd: Type.String({ minLength: 1 }) }, { additionalProperties: false })
const openInEditorSchema = Type.Object({ filePath: Type.String({ minLength: 1 }) }, { additionalProperties: false })
const suggestTagsSchema = Type.Object({ entryId: Type.Integer() }, { additionalProperties: false })
const resizeWindowSchema = Type.Object(
  {
    width: Type.Integer({ minimum: 1 }),
    height: Type.Integer({ minimum: 1 })
  },
  { additionalProperties: false }
)
const showOpenDialogSchema = Type.Optional(
  Type.Object(
    {
      opts: Type.Optional(
        Type.Object(
          {
            title: Type.Optional(Type.String()),
            defaultPath: Type.Optional(Type.String()),
            properties: Type.Optional(Type.Array(Type.Union([Type.Literal('openFile'), Type.Literal('openDirectory')])))
          },
          { additionalProperties: false }
        )
      )
    },
    { additionalProperties: false }
  )
)

export function kbRpcDataHandlers(app: App) {
  return {
    list: (params: unknown) => {
      const opts = params == null ? {} : parseRpcPayload(listOptsSchema, params, 'list')
      return app.list(opts)
    },
    getEntry: (params: unknown) => {
      const { id } = parseRpcPayload(getEntryParams, params, 'getEntry')
      return app.getEntry(id)
    },
    getListStats: (_params: unknown) => app.getListStats(),
    sync: (params: unknown) => {
      const p = params == null ? {} : parseRpcPayload(syncParamsInner, params, 'sync')
      return app.sync(p.sourcesDir)
    },
    getStats: (_params: unknown) => app.getStats(),
    getConfig: (_params: unknown) => app.getConfig(),
    saveConfig: (params: unknown) => {
      const patch = parseRpcPayload(configPatchSchema, params, 'saveConfig')
      return app.applyConfigPatch(patch)
    }
  }
}

export function kbRpcTaskHandlers(app: App) {
  return {
    createTask: (params: unknown) => {
      const input = parseRpcPayload(taskCreateSchema, params, 'createTask')
      return app.createTask(input)
    },
    updateTask: (params: unknown) => {
      const { id, patch } = parseRpcPayload(taskUpdateSchema, params, 'updateTask')
      return app.updateTask(id, patch)
    },
    deleteTask: (params: unknown) => {
      const { id } = parseRpcPayload(getEntryParams, params, 'deleteTask')
      return app.deleteTask(id)
    },
    cycleStatus: (params: unknown) => {
      const p = parseRpcPayload(idWithDirSchema, params, 'cycleStatus')
      return app.cycleStatus(p.id, p.dir)
    },
    cyclePriority: (params: unknown) => {
      const p = parseRpcPayload(idWithDirSchema, params, 'cyclePriority')
      return app.cyclePriority(p.id, p.dir)
    },
    reorderTask: (params: unknown) => {
      const p = parseRpcPayload(idWithReorderDirSchema, params, 'reorderTask')
      return app.reorderTask(p.id, p.dir)
    }
  }
}

export function kbRpcOpenHandlers(app: App) {
  return {
    openExternal: (params: unknown) => {
      const { url } = parseRpcPayload(openExternalSchema, params, 'openExternal')
      return app.openExternal(url)
    },
    pasteInTerminal: (params: unknown) => {
      const { cmd } = parseRpcPayload(pasteInTerminalSchema, params, 'pasteInTerminal')
      return app.pasteInTerminal(cmd)
    },
    openInEditor: (params: unknown) => {
      const { filePath } = parseRpcPayload(openInEditorSchema, params, 'openInEditor')
      return app.openInEditor(filePath)
    }
  }
}

export function kbRpcDialogHandlers(app: App) {
  return {
    showOpenDialog: (params: unknown) => {
      const opts = parseRpcPayload(showOpenDialogSchema, params, 'showOpenDialog')
      return app.showOpenDialog(opts?.opts)
    },
    fetchPreviewImage: (params: unknown) => {
      const { url } = parseRpcPayload(openExternalSchema, params, 'fetchPreviewImage')
      return app.fetchPreviewImage(url)
    },
    suggestTags: (params: unknown) => {
      const { entryId } = parseRpcPayload(suggestTagsSchema, params, 'suggestTags')
      return app.suggestTags(entryId)
    },
    resizeWindow: (params: unknown) => {
      const { width, height } = parseRpcPayload(resizeWindowSchema, params, 'resizeWindow')
      return app.resizeWindow(width, height)
    }
  }
}
