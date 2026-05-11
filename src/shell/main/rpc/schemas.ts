import { ENTRY_TYPE_VALUES } from '@core/domain/constants'
import { type Static, type TSchema, Type } from '@sinclair/typebox'
import { Value } from '@sinclair/typebox/value'

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
  Type.Literal(ENTRY_TYPE_VALUES[3])
])

export const listOptsSchema = Type.Object(
  {
    query: Type.Optional(Type.String()),
    tags: Type.Optional(Type.Array(Type.String())),
    types: Type.Optional(Type.Array(entryTypeSchema)),
    taskView: Type.Optional(taskViewSchema),
    limit: Type.Optional(Type.Integer({ minimum: 1, maximum: RPC_LIST_LIMIT_MAX })),
    offset: Type.Optional(Type.Integer({ minimum: 0 }))
  },
  { additionalProperties: false }
)

export const getEntryParams = Type.Object({ id: Type.Integer() }, { additionalProperties: false })

export const syncParamsInner = Type.Object(
  {
    sourcesDir: Type.Optional(Type.String({ minLength: 1 }))
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

export const taskCreateSchema = Type.Object({ key: Type.String({ minLength: 1 }) }, { additionalProperties: false })

export const taskUpdateSchema = Type.Object(
  {
    id: Type.Integer(),
    patch: Type.Object({ desc: Type.Optional(Type.String()) }, { additionalProperties: false })
  },
  { additionalProperties: false }
)

export const dirSchema = Type.Union([Type.Literal('forward'), Type.Literal('backward')])
export const reorderDirSchema = Type.Union([Type.Literal('up'), Type.Literal('down')])

export function parseRpcPayload<T extends TSchema>(schema: T, raw: unknown, label: string): Static<T> {
  if (!Value.Check(schema, raw)) {
    const msg = [...Value.Errors(schema, raw)].map(issue => `${issue.path || '(root)'}: ${issue.message}`).join('; ')
    throw new Error(`${label}: ${msg}`)
  }
  return raw as Static<T>
}
