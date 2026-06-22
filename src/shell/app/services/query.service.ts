import fs from 'node:fs/promises'
import { rankSuggestedTags } from '@core/domain/models/knowledges/tags/rank_suggested_tags.util'
import type { Knowledge } from '@core'
import type { ListOpts, ListStats, RpcDbStats, RpcListEntry } from '@shared/rpc'
import type { LoadedConfig } from '../config/config.loader'
import type { BindingRef } from '@shared/rpc'
import { listAllBindings, listBindingsByChord } from '../db/binding.repository'
import { recordBindingVisit as persistBindingVisit } from '../db/binding_frecency.repository'
import { findAll, findById, getDbStats } from '../db/entry.repository'
import { recordEntryVisit as persistEntryVisit } from '../db/frecency.repository'
import { countKnowledgeForOpts, listKnowledgeForOpts } from '../lib/list/query.util'
import { buildListStats } from '../lib/list/stats.util'
import { buildListStatsForFilters } from '../lib/list/stats_for_filters.util'
import type { LifecycleService } from './lifecycle.service'

export class QueryService {
  constructor(
    private readonly lifecycle: LifecycleService,
    private readonly loaded: LoadedConfig
  ) {}

  private resolve<T>(v: T): Promise<T> {
    return Promise.resolve(v)
  }

  private raw() {
    return this.lifecycle.getDbForTaskMutation().raw
  }

  list(opts: ListOpts = {}): Promise<RpcListEntry[]> {
    return this.resolve(listKnowledgeForOpts(this.raw(), this.loaded, opts, this.lifecycle.listCache))
  }

  listMatchCount(opts: ListOpts = {}): Promise<number> {
    return this.resolve(countKnowledgeForOpts(this.raw(), this.loaded, opts))
  }

  getEntry(id: number): Promise<Knowledge | null> {
    return this.resolve(findById(this.raw(), id))
  }

  recordEntryVisit(id: number): Promise<{ ok: true }> {
    persistEntryVisit(this.raw(), id)
    this.lifecycle.invalidateListCache()
    return this.resolve({ ok: true })
  }

  listBindings(): Promise<BindingRef[]> {
    return this.resolve(listAllBindings(this.raw()))
  }

  listBindingsByChord(hash: string): Promise<BindingRef[]> {
    return this.resolve(listBindingsByChord(this.raw(), hash))
  }

  recordBindingVisit(id: string, weight: number): Promise<{ ok: true }> {
    persistBindingVisit(this.raw(), id, weight)
    return this.resolve({ ok: true })
  }

  getListStats(filters: Partial<Pick<ListOpts, 'query' | 'tags' | 'types' | 'taskView'>> = {}): Promise<ListStats> {
    const hasContext =
      (filters.query !== undefined && filters.query.trim() !== '') ||
      (filters.types?.length ?? 0) > 0 ||
      (filters.tags?.length ?? 0) > 0 ||
      filters.taskView !== undefined

    if (!hasContext) {
      if (this.lifecycle.listStatsCache) return this.resolve(this.lifecycle.listStatsCache)
      this.lifecycle.listStatsCache = buildListStats(this.raw())
      return this.resolve(this.lifecycle.listStatsCache)
    }

    return this.resolve(buildListStatsForFilters(this.raw(), this.loaded, filters))
  }

  async getStats(): Promise<RpcDbStats> {
    if (this.lifecycle.dbStatsCache) return this.lifecycle.dbStatsCache
    const stats = getDbStats(this.raw())
    let dbSize = 0
    try {
      const stat = await fs.stat(this.loaded.database.path)
      dbSize = stat.size
    } catch {
      dbSize = 0
    }
    this.lifecycle.dbStatsCache = {
      total: stats.total,
      byType: stats.byType,
      dbPath: this.loaded.database.path,
      dbSize
    }
    return this.lifecycle.dbStatsCache
  }

  async suggestTags(entryId: number): Promise<string[]> {
    const entry = await this.getEntry(entryId)
    if (!entry) return []
    const allEntries = findAll(this.raw(), { limit: -1, offset: 0 })
    return rankSuggestedTags(entry, allEntries)
  }
}
