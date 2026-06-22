import type { EntryType } from '@core/domain/types/entry.types'
import type { TaskView } from '@shared/rpc'
import type { LoadedConfig } from '../../config/config.loader'
import type { openDatabase } from '../../db/client'
import { getTagCounts } from '../../db/entry.repository'
import { countKnowledgeForOpts } from './query.util'

type DbRaw = ReturnType<typeof openDatabase>['raw']

export function buildTagFacetCounts(
  raw: DbRaw,
  loaded: LoadedConfig,
  query: string | undefined,
  types: EntryType[] | undefined,
  taskView: TaskView | undefined,
  selectedTags: string[] | undefined
): Record<string, number> {
  const tagKeys = Object.keys(getTagCounts(raw))
  const tagsOut: Record<string, number> = {}
  const selectedSet = new Set(selectedTags ?? [])
  for (const tag of tagKeys) {
    const marginalTags = selectedSet.has(tag) ? [...(selectedTags ?? [])] : [...(selectedTags ?? []), tag]
    const uniqueTags = [...new Set(marginalTags)]
    tagsOut[tag] = countKnowledgeForOpts(raw, loaded, {
      query,
      types,
      taskView,
      tags: uniqueTags
    })
  }
  return tagsOut
}
