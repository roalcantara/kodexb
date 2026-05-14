import type { Knowledge } from '../../../core'
import type { ListOpts } from '../../../shared/rpc'
import type { LoadedConfig } from '../config/config.loader'
import type { openDatabase } from '../db/client'
import { findAll } from '../db/entry.repository'
import { DEFAULT_LIST_PAGE_SIZE, stableListCacheKey, toFindAllOpts } from './app_list_opts.util'
import { filterKnowledgeByTaskView } from './task_views.util'

type DbRaw = ReturnType<typeof openDatabase>['raw']

export function listKnowledgeForOpts(
  raw: DbRaw,
  loaded: LoadedConfig,
  opts: ListOpts,
  listCache: Map<string, Knowledge[]>
): Knowledge[] {
  const pageSize = Number.parseInt(loaded.display.pageSize, 10)
  const safePage = Number.isFinite(pageSize) && pageSize > 0 ? pageSize : DEFAULT_LIST_PAGE_SIZE
  const limit = opts.limit ?? safePage
  const offset = opts.offset ?? 0

  if (opts.taskView) {
    if (opts.types?.length && !opts.types.includes('task')) {
      return []
    }
    const base = findAll(raw, {
      query: opts.query,
      tags: opts.tags,
      types: opts.types?.length ? opts.types : ['task'],
      limit: -1,
      offset: 0
    })
    const filtered = filterKnowledgeByTaskView(base, opts.taskView)
    return filtered.slice(offset, offset + limit)
  }

  const cacheKey = stableListCacheKey({ ...opts, limit, offset })
  const hit = listCache.get(cacheKey)
  if (hit) return hit

  const rows = findAll(raw, { ...toFindAllOpts(opts), limit, offset })
  listCache.set(cacheKey, rows)
  return rows
}
