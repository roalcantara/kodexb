import { DEFAULTS } from '@core/constants/defaults.const'
import { type Static, Type } from '@sinclair/typebox'
import { Value } from '@sinclair/typebox/value'
import { err, ok, type Result } from 'neverthrow'

export const PAGE_SIZE_SMALL = 25
export const PAGE_SIZE_MEDIUM = 50
export const PAGE_SIZE_LARGE = 100
export const PAGE_SIZE_XL = 200
const PAGE_SIZE_VALUES = [PAGE_SIZE_SMALL, PAGE_SIZE_MEDIUM, PAGE_SIZE_LARGE, PAGE_SIZE_XL] as const

const PageSize = Type.Union(PAGE_SIZE_VALUES.map(value => Type.Literal(String(value))))

const DisplayConfig = Type.Object({
  terminalApp: Type.Optional(Type.String()),
  editorApp: Type.Optional(Type.String()),
  pageSize: Type.Optional(PageSize),
  advisories: Type.Optional(Type.Boolean())
})

export const configSchema = Type.Object({
  database: Type.Optional(Type.Object({ path: Type.Optional(Type.String()) })),
  sources: Type.Optional(Type.Object({ path: Type.Optional(Type.String()) })),
  display: Type.Optional(DisplayConfig)
})

export type RawConfig = Static<typeof configSchema>

export type ResolvedConfig = {
  database: { path: string }
  sources: { path: string }
  display: { terminalApp?: string; editorApp?: string; pageSize: '25' | '50' | '100' | '200'; advisories?: boolean }
}

export const DEFAULT_CONFIG_BODY: RawConfig = {
  database: { path: DEFAULTS.database.path },
  sources: { path: DEFAULTS.sources.path },
  display: {}
}

export function parseConfig(raw: unknown): Result<RawConfig, string[]> {
  if (!Value.Check(configSchema, raw)) {
    const issues = [...Value.Errors(configSchema, raw)].map(e => `${e.path || '(root)'}: ${e.message}`)
    return err(issues)
  }
  return ok(raw as RawConfig)
}
