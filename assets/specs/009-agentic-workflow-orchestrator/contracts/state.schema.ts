// Spec fixture for AWO-1 / AWO-4 / AWO-13 — persisted xstate snapshot envelope.
// The snapshot field is xstate's own PersistedSnapshot; we wrap it with a
// header that carries identity, schema version, and the canonical run_id
// from OBSERVABILITY_GUIDE.md.
// Ephemeral spike — promoted on the MVP slice to
// packages/ops/src/governance/specs/workflow/schemas/.
// Runtime imports from that stable path, never from this spec folder.

import { Type, type Static } from '@sinclair/typebox'

export const STATE_SCHEMA_VERSION = '009.1.0' as const

export const PersistedRunState = Type.Object({
  schema_version: Type.Literal(STATE_SCHEMA_VERSION),
  run_id: Type.String({ description: 'canonical run_id per OBSERVABILITY_GUIDE.md' }),
  profile_name: Type.String(),
  profile_schema_version: Type.String(),
  started_at: Type.String({ format: 'date-time' }),
  last_persisted_at: Type.String({ format: 'date-time' }),
  // xstate snapshot is opaque to us at the schema level; validate at runtime via xstate.
  xstate_snapshot: Type.Unknown(),
  // Run-shared decisions/memory live alongside the snapshot for resume.
  shared_memory: Type.Record(Type.String(), Type.Unknown()),
  // AWO-13 — set when the snapshot was persisted during graceful shutdown.
  shutdown_reason: Type.Optional(Type.String())
})

export type PersistedRunStateT = Static<typeof PersistedRunState>
