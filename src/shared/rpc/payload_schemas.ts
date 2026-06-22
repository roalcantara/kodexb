import { TASK_PRIORITY_VALUES } from '@core/domain/constants/entry.const'
import { TASK_VIEW_ORDER } from '@core/domain/models/knowledges/task_views/task_view_order.const'
import { ENTRY_TYPE_VALUES } from '@shared/constants/entry_type.const'
import { literalUnion, strictObject } from '@shared/typebox'
import { Type } from '@sinclair/typebox'

const PAGE_SIZE_SMALL = 25
const PAGE_SIZE_MEDIUM = 50
const PAGE_SIZE_LARGE = 100
const PAGE_SIZE_XL = 200
const pageSizePatchSchema = literalUnion([PAGE_SIZE_SMALL, PAGE_SIZE_MEDIUM, PAGE_SIZE_LARGE, PAGE_SIZE_XL] as const)

/** Upper bound for `list` pagination (guards pathological RPC payloads). */
export const RPC_LIST_LIMIT_MAX = 10_000

const taskViewSchema = literalUnion(TASK_VIEW_ORDER)
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

/** ARCH-1 AC6/AC7 — canonical ListStats schema. */
export const listStatsSchema = strictObject({
  total: Type.Integer(),
  taskViews: Type.Record(taskViewSchema, Type.Integer()),
  tags: Type.Record(Type.String(), Type.Integer()),
  byType: Type.Record(entryTypeSchema, Type.Integer())
})

export const getEntryParams = strictObject({ id: Type.Integer() })

export const configPatchSchema = strictObject({
  sourcesDir: Type.Optional(Type.String({ minLength: 1 })),
  dbPath: Type.Optional(Type.String({ minLength: 1 })),
  configPath: Type.Optional(Type.String({ minLength: 1 })),
  terminalApp: Type.Optional(Type.String()),
  editorApp: Type.Optional(Type.String()),
  pageSize: Type.Optional(pageSizePatchSchema),
  advisories: Type.Optional(Type.Boolean())
})

const priorityUnionSchema = literalUnion(TASK_PRIORITY_VALUES)
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

export const showOpenDialogSchema = strictObject({
  opts: Type.Optional(
    strictObject({
      title: Type.Optional(Type.String()),
      defaultPath: Type.Optional(Type.String()),
      properties: Type.Optional(Type.Array(literalUnion(['openFile', 'openDirectory'] as const)))
    })
  )
})

/**
 * ARCH-1 AC2/AC6 — canonical binding-row schema. The RPC wire type, the core
 * collision detector, and the shell repository mapper all derive their
 * `BindingRef` from this single definition via `Static<typeof>`.
 */
const bindingPlatformSchema = literalUnion(['macos', 'linux', 'windows', 'any'] as const)
const bindingScopeSchema = literalUnion(['global', 'local'] as const)

export const bindingRefSchema = strictObject({
  bindingId: Type.String(),
  entryKey: Type.String(),
  app: Type.String(),
  platform: bindingPlatformSchema,
  scope: bindingScopeSchema,
  chordHash: Type.String(),
  chordPrefix: Type.Union([Type.String(), Type.Null()]),
  action: Type.String()
})
