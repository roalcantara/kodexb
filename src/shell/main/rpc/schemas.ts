export * from '@shared/rpc/payload_schemas'

import { Type } from '@sinclair/typebox'
import { literalUnion, strictObject } from '@shared/typebox'

export const syncParamsInner = strictObject({
  sourcesDir: Type.Optional(Type.String({ minLength: 1 })),
  skipLearnedRestore: Type.Optional(Type.Boolean())
})

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

/** POST body for `showOpenDialog` accepts `{}` or `{ opts?: {...} }`. */
const e2eFaultModes = literalUnion(['off', 'source_write_failed', 'unset'] as const)
export const e2eFaultModeSchema = strictObject({ mode: e2eFaultModes })
