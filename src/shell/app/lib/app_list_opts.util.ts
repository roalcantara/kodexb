import type { Knowledge } from '../../../core'
import type { ListOpts } from '../../../shared/rpc'
import type { FindAllOpts } from '../db/entry.repository'

type TaskKnowledge = Extract<Knowledge, { type: 'task' }>

/** Fallback when `display.pageSize` is missing or invalid (matches common YAML default). */
export const DEFAULT_LIST_PAGE_SIZE = 50

export function isTask(k: Knowledge): k is TaskKnowledge {
  return k.type === 'task'
}

export function stableListCacheKey(opts: ListOpts): string {
  return JSON.stringify(opts)
}

export function toFindAllOpts(opts: ListOpts): FindAllOpts {
  return {
    query: opts.query,
    tags: opts.tags,
    types: opts.types,
    limit: opts.limit,
    offset: opts.offset
  }
}
