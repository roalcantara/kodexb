import { describe, expect, it } from 'bun:test'
import { sampleListStats } from '@testing/fixtures/list_stats.fixture'

import { buildFilterRows, groupFilterRowsIntoSections } from './compact_filter_overlay_build_rows.util'

const stats = sampleListStats({ tags: { a: 1 } })

describe('compactFilterOverlayBuildRows', () => {
  describe('groupFilterRowsIntoSections', () => {
    describe('with multi-kind filter rows', () => {
      it('splits by kind in build order', () => {
        const tagRows = [{ tag: 'a', count: 1 }]
        const rows = buildFilterRows(stats, [], [], undefined, tagRows, '')
        const sections = groupFilterRowsIntoSections(rows)
        expect(sections.map(s => s.title)).toEqual(['Quick', 'Task views', 'Types', 'Tags'])
        expect(sections[0]?.rows).toHaveLength(1)
        expect(sections.some(section => section.title === 'Task views' && section.rows.length > 0)).toBe(true)
      })
    })
  })

  describe('buildFilterRows', () => {
    describe('with zero-count type', () => {
      it('omits if not selected', () => {
        const rows = buildFilterRows(stats, [], [], undefined, [{ tag: 'a', count: 1 }], '')
        const commands = rows.filter(r => r.kind === 'type' && r.label === 'Command')
        expect(commands).toHaveLength(0)
      })
    })

    describe('when type is selected', () => {
      it('keeps zero-count row', () => {
        const rows = buildFilterRows(stats, ['command'], [], undefined, [{ tag: 'a', count: 1 }], '')
        const commands = rows.filter(r => r.kind === 'type' && r.label === 'Command')
        expect(commands).toHaveLength(1)
      })
    })
  })
})
