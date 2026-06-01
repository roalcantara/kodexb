import { getLogger } from '@shared/logging'
import type { BindingRef } from '@shared/rpc'
import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { listBindings, onAfterSyncComplete } from '../../rpc/client'
import { computeCollisionsByHash } from '../../utils/shortcuts/binding_collisions_by_hash.util'

type CollisionKind = 'hard' | 'soft'

type Collision = {
  bindingId: string
  kind: CollisionKind
  otherBindingId: string
  otherChordHash: string
  otherEntryKey: string
  otherApp: string
}

type BindingsCache = {
  all: BindingRef[]
  byHash: Map<string, BindingRef[]>
  byApp: Map<string, BindingRef[]>
  collisionsById: Map<string, Collision[]>
}

const log = getLogger(['kb', 'renderer', 'bindings'])

let snapshot: BindingsCache = {
  all: [],
  byHash: new Map(),
  byApp: new Map(),
  collisionsById: new Map()
}

const listeners = new Set<() => void>()

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

function getSnapshot(): BindingsCache {
  return snapshot
}

function rebuildCache(bindings: BindingRef[]): void {
  const byHash = new Map<string, BindingRef[]>()
  const byApp = new Map<string, BindingRef[]>()
  for (const b of bindings) {
    const hg = byHash.get(b.chordHash) ?? []
    hg.push(b)
    byHash.set(b.chordHash, hg)
    const ag = byApp.get(b.app) ?? []
    ag.push(b)
    byApp.set(b.app, ag)
  }
  snapshot = {
    all: bindings,
    byHash,
    byApp,
    collisionsById: computeCollisionsByHash(bindings)
  }
}

function notifyRefreshFailure(err: unknown): undefined {
  log.warn('Failed to refresh bindings cache: {message}', {
    message: err instanceof Error ? err.message : String(err)
  })
}

export function refreshBindingsCache(): void {
  listBindings()
    .then(rebuildCache)
    .then(() => {
      for (const cb of listeners) cb()
    })
    .catch(notifyRefreshFailure)
}

export function useBindings(): BindingsCache & { refresh: typeof refreshBindingsCache } {
  const cache = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  useEffect(() => {
    const unsub = onAfterSyncComplete(() => refreshBindingsCache())
    return unsub
  }, [])

  useEffect(() => {
    refreshBindingsCache()
  }, [])

  return useMemo(() => ({ ...cache, refresh: refreshBindingsCache }), [cache])
}
