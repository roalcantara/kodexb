import { type Static, Type } from '@sinclair/typebox'

export const STATE_SCHEMA_VERSION = '009.1.0' as const

export const PersistedRunState = Type.Object({
  schema_version: Type.Literal(STATE_SCHEMA_VERSION),
  run_id: Type.String({ description: 'canonical run_id per WORKFLOW_OBSERVABILITY_GUIDE.md' }),
  profile_name: Type.String(),
  profile_schema_version: Type.String(),
  started_at: Type.String({ description: 'ISO 8601 date-time' }),
  last_persisted_at: Type.String({ description: 'ISO 8601 date-time' }),
  xstate_snapshot: Type.Unknown(),
  shared_memory: Type.Record(Type.String(), Type.Unknown()),
  shutdown_reason: Type.Optional(Type.String())
})

export type PersistedRunState = Static<typeof PersistedRunState>
