import { ENTRY_TYPE_VALUES } from '@core/domain/constants'
import { Type } from '@sinclair/typebox'
import { literalUnion, strictObject } from '@shared/typebox'

const PAGE_SIZE_SMALL = 25
const PAGE_SIZE_MEDIUM = 50
const PAGE_SIZE_LARGE = 100
const PAGE_SIZE_XL = 200
const pageSizePatchSchema = literalUnion([PAGE_SIZE_SMALL, PAGE_SIZE_MEDIUM, PAGE_SIZE_LARGE, PAGE_SIZE_XL] as const)

/** Upper bound for `list` pagination (guards pathological RPC payloads). */
export const RPC_LIST_LIMIT_MAX = 10_000

const taskViewValues = ['actionable', 'today', 'overdue', 'this_week', 'all_pending', 'all_doing'] as const
const taskViewSchema = literalUnion(taskViewValues)
const entryTypeSchema = literalUnion(ENTRY_TYPE_VALUES)

const listFilterFields = {
  query: Type.Optional(Type.String()),
  tags: Type.Optional(Type.Array(Type.String())),
  types: Type.Optional(Type.Array(entryTypeSchema)),
  taskView: Type.Optional(taskViewSchema)
}

export const listOptsSchema = strictObject({
  ...listFilterFields,
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: RPC_LIST_LIMIT_MAX })),
  offset: Type.Optional(Type.Integer({ minimum: 0 }))
})

/** Body for `getListStats` when computing contextual facet counts (no pagination keys). */
export const listStatsFilterSchema = strictObject(listFilterFields)

export const getEntryParams = strictObject({ id: Type.Integer() })

export const syncParamsInner = strictObject({
  sourcesDir: Type.Optional(Type.String({ minLength: 1 })),
  skipLearnedRestore: Type.Optional(Type.Boolean())
})

export const configPatchSchema = strictObject({
  sourcesDir: Type.Optional(Type.String({ minLength: 1 })),
  dbPath: Type.Optional(Type.String({ minLength: 1 })),
  configPath: Type.Optional(Type.String({ minLength: 1 })),
  terminalApp: Type.Optional(Type.String()),
  editorApp: Type.Optional(Type.String()),
  pageSize: Type.Optional(pageSizePatchSchema)
})

const priorityUnionSchema = literalUnion(['low', 'mid', 'high', 'urgent'] as const)

const sourceVersionSchema = Type.Integer({ minimum: 0 })

export const taskCreateSchema = strictObject({
  key: Type.String({ minLength: 1 }),
  desc: Type.Optional(Type.String()),
  tags: Type.Optional(Type.Array(Type.String())),
  priority: Type.Optional(priorityUnionSchema),
  dueDate: Type.Optional(Type.Number()),
  dependsOn: Type.Optional(Type.Array(Type.Integer()))
})

export const taskUpdateSchema = strictObject({
  id: Type.Integer(),
  sourceVersion: Type.Optional(sourceVersionSchema),
  patch: strictObject({
    key: Type.Optional(Type.String({ minLength: 1 })),
    desc: Type.Optional(Type.String()),
    tags: Type.Optional(Type.Array(Type.String())),
    priority: Type.Optional(priorityUnionSchema),
    status: Type.Optional(literalUnion(['todo', 'doing', 'done'] as const)),
    dueDate: Type.Optional(Type.Number()),
    dependsOn: Type.Optional(Type.Array(Type.Integer()))
  })
})

export const dirSchema = literalUnion(['forward', 'backward'] as const)
export const reorderDirSchema = literalUnion(['up', 'down'] as const)

export const emptyBodySchema = strictObject({})

export const listBindingsByChordSchema = strictObject({ hash: Type.String({ minLength: 1 }) })

export const recordBindingVisitSchema = strictObject({
  id: Type.String({ minLength: 1 }),
  weight: Type.Number({ default: 1.0 })
})

export const openExternalSchema = strictObject({ url: Type.String({ minLength: 1 }) })
export const pasteInTerminalSchema = strictObject({ cmd: Type.String({ minLength: 1 }) })
export const runInTerminalSchema = strictObject({ cmd: Type.String({ minLength: 1 }) })
export const pasteDocSchema = strictObject({ doc: Type.String({ minLength: 1 }) })
export const openInEditorSchema = strictObject({ filePath: Type.String({ minLength: 1 }) })
export const suggestTagsSchema = strictObject({ entryId: Type.Integer() })

export const hideWindowSchema = strictObject({})

export const syncInfoSchema = strictObject({})
export const resizeWindowSchema = strictObject({
  width: Type.Integer({ minimum: 1 }),
  height: Type.Integer({ minimum: 1 })
})

/**
 * Body for `setWindowPosition` — `x`/`y` are screen coordinates, integer
 * pixels. Bounds are intentionally generous (multi-monitor setups can put
 * the window at negative coordinates) but capped to avoid pathological RPC
 * payloads that would deadlock the native setPosition call.
 */
const WINDOW_COORD_MIN = -32_000
const WINDOW_COORD_MAX = 32_000
export const setWindowPositionSchema = strictObject({
  x: Type.Integer({ minimum: WINDOW_COORD_MIN, maximum: WINDOW_COORD_MAX }),
  y: Type.Integer({ minimum: WINDOW_COORD_MIN, maximum: WINDOW_COORD_MAX })
})

export const getWindowPositionSchema = strictObject({})

export const idWithDirSchema = strictObject({
  id: Type.Integer(),
  sourceVersion: Type.Optional(sourceVersionSchema),
  dir: dirSchema
})

export const idWithReorderDirSchema = strictObject({
  id: Type.Integer(),
  sourceVersion: Type.Optional(sourceVersionSchema),
  dir: reorderDirSchema
})

export const taskDeleteSchema = strictObject({
  id: Type.Integer(),
  sourceVersion: Type.Optional(sourceVersionSchema)
})

/** POST body for `showOpenDialog` accepts `{}` or `{ opts?: {...} }`. */
const e2eFaultModes = literalUnion(['off', 'source_write_failed', 'unset'] as const)
export const e2eFaultModeSchema = strictObject({ mode: e2eFaultModes })

export const showOpenDialogSchema = strictObject({
  opts: Type.Optional(
    strictObject({
      title: Type.Optional(Type.String()),
      defaultPath: Type.Optional(Type.String()),
      properties: Type.Optional(Type.Array(literalUnion(['openFile', 'openDirectory'] as const)))
    })
  )
})
