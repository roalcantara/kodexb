import type { ListStats, TaskView } from '@shared/rpc'
import { useMemo } from 'react'

import {
  buildFilterRows,
  type FilterRow,
  groupFilterRowsIntoSections
} from '../../components/list/compact_filter_overlay_build_rows.util'
import type { EntryTypeOption } from '../../components/list/filter_dropdown.component'
import { sortedTags } from '../../components/list/filter_dropdown.component'

const FACET_SECTION_TITLES = new Set(['Quick', 'Task views'])

type SectionedBlock = {
  title: string
  entries: Array<{ row: FilterRow; index: number }>
}

function buildSectionedBlocks(filterRows: FilterRow[]): SectionedBlock[] {
  const sections = groupFilterRowsIntoSections(filterRows)
  let n = 0
  return sections.map(sec => ({
    title: sec.title,
    entries: sec.rows.map(row => ({ row, index: n++ }))
  }))
}

function splitFacetAndScrollSections(blocks: SectionedBlock[]): {
  facetSectionRows: SectionedBlock[]
  scrollableSectionRows: SectionedBlock[]
} {
  const facetSectionRows: SectionedBlock[] = []
  const scrollableSectionRows: SectionedBlock[] = []
  for (const block of blocks) {
    if (FACET_SECTION_TITLES.has(block.title)) facetSectionRows.push(block)
    else scrollableSectionRows.push(block)
  }
  return { facetSectionRows, scrollableSectionRows }
}

export function useCompactFilterOverlayRows(
  stats: ListStats,
  types: EntryTypeOption[],
  tags: string[],
  taskView: TaskView | undefined,
  search: string
) {
  const tagRows = useMemo(() => sortedTags(stats.tags, search, tags), [stats.tags, search, tags])

  const filterRows = useMemo(
    () => buildFilterRows(stats, types, tags, taskView, tagRows, search),
    [stats, types, taskView, tags, tagRows, search]
  )

  const { facetSectionRows, scrollableSectionRows } = useMemo(() => {
    const blocks = buildSectionedBlocks(filterRows)
    return splitFacetAndScrollSections(blocks)
  }, [filterRows])

  const filterRowsScrollKey = useMemo(() => filterRows.map(r => r.id).join('\0'), [filterRows])

  return { filterRows, facetSectionRows, scrollableSectionRows, filterRowsScrollKey }
}
