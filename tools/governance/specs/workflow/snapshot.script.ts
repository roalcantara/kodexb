import { Value } from '@sinclair/typebox/value'
import { createActor } from 'xstate'
import { type PersistenceConfig, readStateSnapshot, writeStateSnapshot } from './persistence.script.ts'
import {
  PersistedRunState,
  type PersistedRunState as PersistedRunStateType,
  STATE_SCHEMA_VERSION
} from './schemas/state.schema.ts'

export function persistMachineSnapshot(
  actor: { getPersistedSnapshot: () => unknown },
  config: PersistenceConfig,
  runId: string,
  dateStr: string,
  profile_name: string,
  profile_schema_version: string,
  started_at: string,
  shared_memory?: Record<string, unknown>
): string {
  const snapshot = actor.getPersistedSnapshot()
  const state: PersistedRunStateType = {
    schema_version: STATE_SCHEMA_VERSION,
    run_id: runId,
    profile_name,
    profile_schema_version,
    started_at,
    last_persisted_at: new Date().toISOString(),
    xstate_snapshot: snapshot,
    shared_memory: shared_memory ?? {}
  }
  return writeStateSnapshot(config, runId, dateStr, state)
}

export function hydrateMachineActor(
  machine: Parameters<typeof createActor>[0],
  config: PersistenceConfig,
  runId: string,
  dateStr: string
): { actor: ReturnType<typeof createActor>; state: PersistedRunStateType } | null {
  const raw = readStateSnapshot(config, runId, dateStr)
  if (!raw) return null
  if (!Value.Check(PersistedRunState, raw)) return null

  const state = raw as PersistedRunStateType
  // biome-ignore lint/suspicious/noExplicitAny: snapshot from JSON is untyped
  const actor = createActor(machine, { snapshot: state.xstate_snapshot as any })
  return { actor, state }
}
