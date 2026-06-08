import { ENTRY_TYPE_VALUES } from '@core/domain/constants'
import { Type } from '@sinclair/typebox'

const PAGE_SIZE_SMALL = 25
const PAGE_SIZE_MEDIUM = 50
const PAGE_SIZE_LARGE = 100
const PAGE_SIZE_XL = 200
const pageSizePatchSchema = Type.Union([
  Type.Literal(PAGE_SIZE_SMALL),
  Type.Literal(PAGE_SIZE_MEDIUM),
  Type.Literal(PAGE_SIZE_LARGE),
  Type.Literal(PAGE_SIZE_XL)
])

/** Upper bound for `list` pagination (guards pathological RPC payloads). */
export const RPC_LIST_LIMIT_MAX = 10_000

const taskViewValues = ['actionable', 'today', 'overdue', 'this_week', 'all_pending', 'all_doing'] as const
const taskViewSchema = Type.Union([
  Type.Literal(taskViewValues[0]),
  Type.Literal(taskViewValues[1]),
  Type.Literal(taskViewValues[2]),
  Type.Literal(taskViewValues[3]),
  Type.Literal(taskViewValues[4]),
  Type.Literal(taskViewValues[5])
])
const entryTypeSchema = Type.Union([
  Type.Literal(ENTRY_TYPE_VALUES[0]),
  Type.Literal(ENTRY_TYPE_VALUES[1]),
  Type.Literal(ENTRY_TYPE_VALUES[2]),
  Type.Literal(ENTRY_TYPE_VALUES[3]),
  Type.Literal(ENTRY_TYPE_VALUES[4])
])

const listFilterFields = {
  query: Type.Optional(Type.String()),
  tags: Type.Optional(Type.Array(Type.String())),
  types: Type.Optional(Type.Array(entryTypeSchema)),
  taskView: Type.Optional(taskViewSchema)
}

export const listOptsSchema = Type.Object(
  {
    ...listFilterFields,
    limit: Type.Optional(Type.Integer({ minimum: 1, maximum: RPC_LIST_LIMIT_MAX })),
    offset: Type.Optional(Type.Integer({ minimum: 0 }))
  },
  { additionalProperties: false }
)

/** Body for `getListStats` when computing contextual facet counts (no pagination keys). */
export const listStatsFilterSchema = Type.Object(listFilterFields, { additionalProperties: false })

export const getEntryParams = Type.Object({ id: Type.Integer() }, { additionalProperties: false })

export const syncParamsInner = Type.Object(
  {
    sourcesDir: Type.Optional(Type.String({ minLength: 1 })),
    skipLearnedRestore: Type.Optional(Type.Boolean())
  },
  { additionalProperties: false }
)

export const configPatchSchema = Type.Object(
  {
    sourcesDir: Type.Optional(Type.String({ minLength: 1 })),
    dbPath: Type.Optional(Type.String({ minLength: 1 })),
    configPath: Type.Optional(Type.String({ minLength: 1 })),
    terminalApp: Type.Optional(Type.String()),
    editorApp: Type.Optional(Type.String()),
    pageSize: Type.Optional(pageSizePatchSchema)
  },
  { additionalProperties: false }
)

const priorityUnionSchema = Type.Union([
  Type.Literal('low'),
  Type.Literal('mid'),
  Type.Literal('high'),
  Type.Literal('urgent')
])

const sourceVersionSchema = Type.Number()

export const taskCreateSchema = Type.Object(
  {
    key: Type.String({ minLength: 1 }),
    desc: Type.Optional(Type.String()),
    tags: Type.Optional(Type.Array(Type.String())),
    priority: Type.Optional(priorityUnionSchema),
    dueDate: Type.Optional(Type.Number()),
    dependsOn: Type.Optional(Type.Array(Type.Integer()))
  },
  { additionalProperties: false }
)

export const taskUpdateSchema = Type.Object(
  {
    id: Type.Integer(),
    sourceVersion: Type.Optional(sourceVersionSchema),
    patch: Type.Object(
      {
        key: Type.Optional(Type.String({ minLength: 1 })),
        desc: Type.Optional(Type.String()),
        tags: Type.Optional(Type.Array(Type.String())),
        priority: Type.Optional(priorityUnionSchema),
        status: Type.Optional(Type.Union([Type.Literal('todo'), Type.Literal('doing'), Type.Literal('done')])),
        dueDate: Type.Optional(Type.Number()),
        dependsOn: Type.Optional(Type.Array(Type.Integer()))
      },
      { additionalProperties: false }
    )
  },
  { additionalProperties: false }
)

export const dirSchema = Type.Union([Type.Literal('forward'), Type.Literal('backward')])
export const reorderDirSchema = Type.Union([Type.Literal('up'), Type.Literal('down')])

export const emptyBodySchema = Type.Object({}, { additionalProperties: false })

export const listBindingsByChordSchema = Type.Object(
  { hash: Type.String({ minLength: 1 }) },
  { additionalProperties: false }
)

export const recordBindingVisitSchema = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    weight: Type.Number({ default: 1.0 })
  },
  { additionalProperties: false }
)

export const openExternalSchema = Type.Object({ url: Type.String({ minLength: 1 }) }, { additionalProperties: false })
export const pasteInTerminalSchema = Type.Object(
  { cmd: Type.String({ minLength: 1 }) },
  { additionalProperties: false }
)
export const runInTerminalSchema = Type.Object({ cmd: Type.String({ minLength: 1 }) }, { additionalProperties: false })
export const pasteDocSchema = Type.Object({ doc: Type.String({ minLength: 1 }) }, { additionalProperties: false })
export const openInEditorSchema = Type.Object(
  { filePath: Type.String({ minLength: 1 }) },
  { additionalProperties: false }
)
export const suggestTagsSchema = Type.Object({ entryId: Type.Integer() }, { additionalProperties: false })

export const hideWindowSchema = Type.Object({}, { additionalProperties: false })

export const syncInfoSchema = Type.Object({}, { additionalProperties: false })
export const resizeWindowSchema = Type.Object(
  {
    width: Type.Integer({ minimum: 1 }),
    height: Type.Integer({ minimum: 1 })
  },
  { additionalProperties: false }
)

/**
 * Body for `setWindowPosition` — `x`/`y` are screen coordinates, integer
 * pixels. Bounds are intentionally generous (multi-monitor setups can put
 * the window at negative coordinates) but capped to avoid pathological RPC
 * payloads that would deadlock the native setPosition call.
 */
const WINDOW_COORD_MIN = -32_000
const WINDOW_COORD_MAX = 32_000
export const setWindowPositionSchema = Type.Object(
  {
    x: Type.Integer({ minimum: WINDOW_COORD_MIN, maximum: WINDOW_COORD_MAX }),
    y: Type.Integer({ minimum: WINDOW_COORD_MIN, maximum: WINDOW_COORD_MAX })
  },
  { additionalProperties: false }
)

export const getWindowPositionSchema = Type.Object({}, { additionalProperties: false })

export const idWithDirSchema = Type.Object(
  {
    id: Type.Integer(),
    sourceVersion: Type.Optional(sourceVersionSchema),
    dir: dirSchema
  },
  { additionalProperties: false }
)

export const idWithReorderDirSchema = Type.Object(
  {
    id: Type.Integer(),
    sourceVersion: Type.Optional(sourceVersionSchema),
    dir: reorderDirSchema
  },
  { additionalProperties: false }
)

export const taskDeleteSchema = Type.Object(
  {
    id: Type.Integer(),
    sourceVersion: Type.Optional(sourceVersionSchema)
  },
  { additionalProperties: false }
)

/** POST body for `showOpenDialog` accepts `{}` or `{ opts?: {...} }`. */
export const showOpenDialogSchema = Type.Object(
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
