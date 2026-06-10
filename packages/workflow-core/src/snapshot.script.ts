import { Value } from '@sinclair/typebox/value'
import { createActor } from 'xstate'
import {
  PersistedRunState,
  type PersistedRunState as PersistedRunStateType,
  STATE_SCHEMA_VERSION
} from './schemas/state.schema.ts'

export type PersistenceConfig = {
  rootDir: string
  metricsDir: string
}

// biome-ignore lint/style/useNamingConvention: IO is a standard initialism
export type SnapshotIO = {
  readSnapshot: (config: PersistenceConfig, runId: string, dateStr: string) => object | null
  writeSnapshot: (config: PersistenceConfig, runId: string, dateStr: string, state: object) => string
}

export function persistMachineSnapshot(
  actor: { getPersistedSnapshot: () => unknown },
  config: PersistenceConfig,
  io: SnapshotIO,
  runId: string,
  dateStr: string,
  profileName: string,
  profileSchemaVersion: string,
  startedAt: string,
  sharedMemory?: Record<string, unknown>
): string {
  const snapshot = actor.getPersistedSnapshot()
  const state: PersistedRunStateType = {
    schema_version: STATE_SCHEMA_VERSION,
    run_id: runId,
    profile_name: profileName,
    profile_schema_version: profileSchemaVersion,
    started_at: startedAt,
    last_persisted_at: new Date().toISOString(),
    xstate_snapshot: snapshot,
    shared_memory: sharedMemory ?? {}
  }
  return io.writeSnapshot(config, runId, dateStr, state)
}

export function hydrateMachineActor(
  machine: Parameters<typeof createActor>[0],
  config: PersistenceConfig,
  io: SnapshotIO,
  runId: string,
  dateStr: string
): { actor: ReturnType<typeof createActor>; state: PersistedRunStateType } | null {
  const raw = io.readSnapshot(config, runId, dateStr)
  if (!raw) return null
  if (!Value.Check(PersistedRunState, raw)) return null

  const state = raw as PersistedRunStateType
  // biome-ignore lint/suspicious/noExplicitAny: snapshot from JSON is untyped
  const actor = createActor(machine, { snapshot: state.xstate_snapshot as any })
  return { actor, state }
}
